import { useState, useEffect } from 'react'
import { getMedicalRecord } from '../storage'
import type { SymptomEntry, Profile, Medication } from '../types'

interface Props {
  profile: Profile
  entries: SymptomEntry[]
}

type Period = 7 | 30 | 90

const PAIN_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336']
const PAIN_LABELS = ['Sin dolor', 'Leve', 'Moderado', 'Severo']

const W = 320
const H = 200
const PAD = { top: 20, right: 16, bottom: 40, left: 28 }
const CW = W - PAD.left - PAD.right  // 276
const CH = H - PAD.top - PAD.bottom  // 140

function yOf(v: number) {
  return PAD.top + ((3 - v) / 3) * CH
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function SymptomTrends({ profile, entries }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [showAdherence, setShowAdherence] = useState(false)
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    if (showAdherence) getMedicalRecord(profile.id).then(rec => setMedications(rec.medications))
  }, [showAdherence, profile.id])

  const today = new Date().toISOString().split('T')[0]
  const startDate = addDays(today, -(period - 1))

  // Aggregate pain by date
  const byDate = new Map<string, number[]>()
  for (const e of entries) {
    if (e.date >= startDate && e.date <= today) {
      if (!byDate.has(e.date)) byDate.set(e.date, [])
      byDate.get(e.date)!.push(e.painLevel)
    }
  }

  // Build ordered array of all days in period
  const allDates: string[] = []
  for (let i = 0; i < period; i++) allDates.push(addDays(startDate, i))

  type PlotPoint = { date: string; pain: number | null }
  const plotData: PlotPoint[] = allDates.map(d => {
    const vals = byDate.get(d)
    return {
      date: d,
      pain: vals ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    }
  })

  const n = plotData.length
  const xOf = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * CW : CW / 2)

  // Build SVG path with gap handling
  let pathD = ''
  let prevHad = false
  for (let i = 0; i < n; i++) {
    const pt = plotData[i]
    if (pt.pain === null) { prevHad = false; continue }
    const x = xOf(i).toFixed(1)
    const y = yOf(pt.pain).toFixed(1)
    pathD += prevHad ? ` L ${x} ${y}` : ` M ${x} ${y}`
    prevHad = true
  }

  // Stats
  const painValues = plotData.filter(p => p.pain !== null).map(p => p.pain as number)
  const daysWithData = painValues.length
  const avgPain = daysWithData ? painValues.reduce((a, b) => a + b, 0) / daysWithData : null
  const maxPain = daysWithData ? Math.max(...painValues) : null

  // X-axis label every N steps
  const step = period === 7 ? 1 : period === 30 ? 7 : 15

  // Medication adherence per day
  const adherenceByDate = new Map<string, number>()
  if (showAdherence && medications.length > 0) {
    for (const date of allDates) {
      let scheduled = 0, taken = 0
      for (const med of medications) {
        if (!med.times.length) continue
        scheduled += med.times.length
        taken += med.takenHistory.filter(r => r.date === date && r.taken).length
      }
      if (scheduled > 0) adherenceByDate.set(date, taken / scheduled)
    }
  }

  const lineColor = avgPain !== null ? PAIN_COLORS[Math.round(avgPain)] : '#FF9800'

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([7, 30, 90] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 10, fontWeight: 700,
              border: `2px solid ${period === p ? '#8A9A5B' : 'var(--border)'}`,
              background: period === p ? 'rgba(138,154,91,0.12)' : 'var(--bg)',
              color: period === p ? '#6B7A46' : 'var(--text-light)',
              cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.9rem',
            }}
          >
            {p === 7 ? '7 días' : p === 30 ? '1 mes' : '3 meses'}
          </button>
        ))}
      </div>

      {daysWithData === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
          <p>No hay datos en los últimos {period} días</p>
        </div>
      ) : (
        <>
          {/* SVG Chart */}
          <div style={{ background: 'var(--bg-card,#f9f5ed)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 6px 4px' }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Color bands */}
              <rect x={PAD.left} y={yOf(3)}           width={CW} height={CH / 3} fill="rgba(244,67,54,0.07)" />
              <rect x={PAD.left} y={yOf(2)}           width={CW} height={CH / 3} fill="rgba(255,152,0,0.07)" />
              <rect x={PAD.left} y={yOf(1)}           width={CW} height={CH / 3} fill="rgba(76,175,80,0.07)" />

              {/* Horizontal gridlines */}
              {[0, 1, 2, 3].map(v => (
                <line
                  key={v}
                  x1={PAD.left} y1={yOf(v)} x2={PAD.left + CW} y2={yOf(v)}
                  stroke="rgba(0,0,0,0.1)" strokeWidth={1}
                  strokeDasharray={v > 0 ? '4 3' : ''}
                />
              ))}

              {/* Y-axis labels (pain level numbers) */}
              {[0, 1, 2, 3].map(v => (
                <text
                  key={v}
                  x={PAD.left - 5} y={yOf(v) + 4}
                  textAnchor="end" fontSize={9} fill="#999"
                >
                  {v}
                </text>
              ))}

              {/* Pain trend line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data dots */}
              {plotData.map((pt, i) => {
                if (pt.pain === null) return null
                return (
                  <circle
                    key={pt.date}
                    cx={xOf(i)} cy={yOf(pt.pain)}
                    r={period === 90 ? 3 : 4}
                    fill={PAIN_COLORS[Math.round(pt.pain)]}
                    stroke="#fff" strokeWidth={1.5}
                  />
                )
              })}

              {/* X-axis date labels */}
              {plotData.map((pt, i) => {
                if (i % step !== 0 && i !== n - 1) return null
                // Skip last label if too close to the previous step label
                const prevStep = Math.floor((n - 1) / step) * step
                if (i === n - 1 && n - 1 - prevStep < step / 2) return null
                const d = new Date(pt.date + 'T00:00')
                return (
                  <text
                    key={pt.date}
                    x={xOf(i)} y={H - PAD.bottom + 14}
                    textAnchor="middle" fontSize={9} fill="#999"
                  >
                    {`${d.getDate()}/${d.getMonth() + 1}`}
                  </text>
                )
              })}

              {/* Medication adherence dots */}
              {showAdherence && Array.from(adherenceByDate.entries()).map(([date, pct]) => {
                const i = allDates.indexOf(date)
                if (i < 0) return null
                const color = pct >= 0.8 ? '#4CAF50' : pct >= 0.5 ? '#FFC107' : '#F44336'
                return (
                  <circle
                    key={`adh-${date}`}
                    cx={xOf(i)} cy={H - PAD.bottom + 28}
                    r={3}
                    fill={color}
                    opacity={0.85}
                  />
                )
              })}
            </svg>

            {/* Y-axis legend */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingRight: 8, paddingBottom: 6, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3].map(v => (
                <span key={v} style={{ fontSize: '0.7rem', color: PAIN_COLORS[v], fontWeight: 700 }}>
                  ● {v} {PAIN_LABELS[v]}
                </span>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {[
              {
                label: 'Promedio',
                value: avgPain !== null ? avgPain.toFixed(1) : '—',
                sub: avgPain !== null ? PAIN_LABELS[Math.round(avgPain)] : '',
                color: avgPain !== null ? PAIN_COLORS[Math.round(avgPain)] : '#888',
              },
              {
                label: 'Máximo',
                value: maxPain !== null ? maxPain.toString() : '—',
                sub: maxPain !== null ? PAIN_LABELS[maxPain] : '',
                color: maxPain !== null ? PAIN_COLORS[maxPain] : '#888',
              },
              {
                label: 'Días',
                value: `${daysWithData}/${period}`,
                sub: 'con datos',
                color: 'var(--text)',
              },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '10px 6px', textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 900, fontSize: '1.3rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 2 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: '0.68rem', color: s.color, marginTop: 1, fontWeight: 600 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Medication adherence toggle */}
          <button
            onClick={() => setShowAdherence(v => !v)}
            style={{
              marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 12,
              border: `2px solid ${showAdherence ? '#2980b9' : 'var(--border)'}`,
              background: showAdherence ? 'rgba(41,128,185,0.08)' : 'var(--bg)',
              color: showAdherence ? '#2980b9' : 'var(--text-light)',
              fontFamily: 'var(--font)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span>💊</span>
            <span style={{ flex: 1 }}>
              {showAdherence ? 'Ocultar adherencia a medicamentos' : 'Ver adherencia a medicamentos'}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {showAdherence ? '▲' : '▼'}
            </span>
          </button>

          {showAdherence && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 10, display: 'flex', gap: 14, justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-light)' }}>
              <span style={{ color: '#4CAF50', fontWeight: 700 }}>● ≥80%</span>
              <span style={{ color: '#FFC107', fontWeight: 700 }}>● 50–79%</span>
              <span style={{ color: '#F44336', fontWeight: 700 }}>● &lt;50%</span>
              <span style={{ opacity: 0.6 }}>· puntos bajo la gráfica</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
