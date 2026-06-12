import { useState, useEffect } from 'react'
import { getVitalSigns, saveVitalSign, deleteVitalSign, generateId } from '../storage'
import type { Profile, VitalSign, VitalType } from '../types'

interface Props {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

type Period = 7 | 30 | 90

interface VitalConfig {
  label: string
  icon: string
  unit: string
  hasTwo: boolean
  twoLabel?: string
  step: number
  min: number
  max: number
  placeholder: string
  placeholder2?: string
  colorFn: (v: number, v2?: number) => string
}

const VITAL_CONFIG: Record<VitalType, VitalConfig> = {
  bp:        { label: 'Presión arterial',   icon: '❤️',  unit: 'mmHg', hasTwo: true,  twoLabel: 'Diastólica (mmHg)', step: 1,   min: 60,  max: 220, placeholder: 'Sistólica', placeholder2: 'Diastólica',
               colorFn: (s) => s < 120 ? '#4CAF50' : s < 130 ? '#8BC34A' : s < 140 ? '#FFC107' : s < 180 ? '#FF9800' : '#F44336' },
  glucose:   { label: 'Glucosa',            icon: '🩸',  unit: 'mg/dL', hasTwo: false, step: 1,   min: 40,  max: 400, placeholder: 'mg/dL',
               colorFn: (v) => v < 70 ? '#2196F3' : v < 100 ? '#4CAF50' : v < 126 ? '#FFC107' : '#F44336' },
  weight:    { label: 'Peso',               icon: '⚖️',  unit: 'kg',   hasTwo: false, step: 0.1, min: 20,  max: 200, placeholder: 'kg',
               colorFn: () => '#8A9A5B' },
  heartRate: { label: 'Frec. cardíaca',     icon: '💓',  unit: 'lpm',  hasTwo: false, step: 1,   min: 30,  max: 220, placeholder: 'lpm',
               colorFn: (v) => v < 60 ? '#2196F3' : v <= 100 ? '#4CAF50' : '#F44336' },
  temp:      { label: 'Temperatura',        icon: '🌡️', unit: '°C',   hasTwo: false, step: 0.1, min: 34,  max: 42,  placeholder: '°C',
               colorFn: (v) => v < 36.1 ? '#2196F3' : v <= 37.2 ? '#4CAF50' : v <= 38 ? '#FFC107' : '#F44336' },
  spo2:      { label: 'Saturación O₂',      icon: '🫁',  unit: '%',    hasTwo: false, step: 1,   min: 70,  max: 100, placeholder: '%',
               colorFn: (v) => v >= 95 ? '#4CAF50' : v >= 92 ? '#FFC107' : '#F44336' },
}

const VITAL_TYPES: VitalType[] = ['bp', 'glucose', 'weight', 'heartRate', 'temp', 'spo2']

// ── SVG chart helpers ──────────────────────────────────────────

const W = 320, H = 180
const PAD = { top: 16, right: 16, bottom: 32, left: 36 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

interface ChartPoint { date: string; value: number | null; value2?: number | null }

function buildPath(pts: ChartPoint[], xOf: (i: number) => number, yOf: (v: number) => number, field: 'value' | 'value2'): string {
  let d = ''
  let prev = false
  for (let i = 0; i < pts.length; i++) {
    const v = pts[i][field]
    if (v == null) { prev = false; continue }
    const x = xOf(i).toFixed(1), y = yOf(v).toFixed(1)
    d += prev ? ` L ${x} ${y}` : ` M ${x} ${y}`
    prev = true
  }
  return d
}

// ── Component ─────────────────────────────────────────────────

export default function VitalSigns({ profile, showToast }: Props) {
  const [activeType, setActiveType] = useState<VitalType>('bp')
  const [signs, setSigns] = useState<VitalSign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [period, setPeriod] = useState<Period>(30)

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [notes, setNotes] = useState('')

  const cfg = VITAL_CONFIG[activeType]

  useEffect(() => {
    getVitalSigns(profile.id, activeType).then(setSigns)
  }, [profile.id, activeType])

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0])
    setTime(new Date().toTimeString().slice(0, 5))
    setValue(''); setValue2(''); setNotes('')
  }

  async function handleSave() {
    const v = parseFloat(value)
    if (isNaN(v)) { showToast('⚠️ Ingresa un valor válido', 'warning'); return }
    const v2 = cfg.hasTwo ? parseFloat(value2) : undefined
    if (cfg.hasTwo && (isNaN(v2!) || !value2.trim())) { showToast('⚠️ Ingresa ambos valores', 'warning'); return }

    const vs: VitalSign = {
      id: generateId(), profileId: profile.id,
      date, time, type: activeType,
      value: v, value2: v2,
      unit: cfg.unit, notes: notes.trim() || undefined,
    }
    await saveVitalSign(vs)
    setSigns(prev => [vs, ...prev])
    showToast(`✅ ${cfg.label} registrada`, 'success')
    setShowForm(false)
    resetForm()
  }

  async function handleDelete(id: string) {
    await deleteVitalSign(id)
    setSigns(prev => prev.filter(s => s.id !== id))
    showToast('🗑 Eliminado')
  }

  // ── Chart data ────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const startDate = addDays(today, -(period - 1))

  const byDate = new Map<string, { sum: number; sum2: number; count: number }>()
  for (const s of signs) {
    if (s.date < startDate || s.date > today) continue
    const cur = byDate.get(s.date) ?? { sum: 0, sum2: 0, count: 0 }
    cur.sum += s.value; cur.sum2 += s.value2 ?? 0; cur.count++
    byDate.set(s.date, cur)
  }

  const allDates: string[] = []
  for (let i = 0; i < period; i++) allDates.push(addDays(startDate, i))

  const plotData: ChartPoint[] = allDates.map(d => {
    const agg = byDate.get(d)
    return agg
      ? { date: d, value: agg.sum / agg.count, value2: cfg.hasTwo ? agg.sum2 / agg.count : null }
      : { date: d, value: null, value2: null }
  })

  const vals = plotData.map(p => p.value).filter(v => v != null) as number[]
  const vals2 = plotData.map(p => p.value2).filter(v => v != null) as number[]
  const allVals = [...vals, ...vals2]
  const dataMin = allVals.length ? Math.min(...allVals) : cfg.min
  const dataMax = allVals.length ? Math.max(...allVals) : cfg.max
  const pad = (dataMax - dataMin) * 0.15 || 5
  const yMin = dataMin - pad, yMax = dataMax + pad

  const n = allDates.length
  const xOf = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * CW : CW / 2)
  const yOf = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * CH

  const step = period === 7 ? 1 : period === 30 ? 7 : 15
  const pathMain = buildPath(plotData, xOf, yOf, 'value')
  const pathTwo  = cfg.hasTwo ? buildPath(plotData, xOf, yOf, 'value2') : ''

  // Latest reading
  const latest = signs[0]
  const latestColor = latest ? cfg.colorFn(latest.value, latest.value2) : '#888'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>📊 Signos vitales</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Registrar</button>
      </div>

      {/* Tipo selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {VITAL_TYPES.map(t => {
          const c = VITAL_CONFIG[t]
          return (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontWeight: 700,
                border: `2px solid ${activeType === t ? '#8A9A5B' : 'var(--border)'}`,
                background: activeType === t ? 'rgba(138,154,91,0.12)' : 'var(--bg)',
                color: activeType === t ? '#6B7A46' : 'var(--text-light)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8rem', whiteSpace: 'nowrap',
              }}
            >
              {c.icon} {c.label}
            </button>
          )
        })}
      </div>

      {/* Latest reading */}
      {latest && (
        <div style={{
          background: 'var(--bg-card)', border: `2px solid ${latestColor}`,
          borderRadius: 14, padding: '14px 18px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: '2rem' }}>{cfg.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Último registro · {new Date(latest.date + 'T00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} {latest.time}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: latestColor, lineHeight: 1.1 }}>
              {cfg.hasTwo ? `${latest.value}/${latest.value2}` : latest.value.toFixed(cfg.step < 1 ? 1 : 0)}
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-light)', marginLeft: 4 }}>{cfg.unit}</span>
            </div>
          </div>
        </div>
      )}

      {vals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-light)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📈</div>
          <p>Sin registros de {cfg.label.toLowerCase()} aún</p>
        </div>
      ) : (
        <>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {([7, 30, 90] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 10, fontWeight: 700,
                border: `2px solid ${period === p ? '#8A9A5B' : 'var(--border)'}`,
                background: period === p ? 'rgba(138,154,91,0.12)' : 'var(--bg)',
                color: period === p ? '#6B7A46' : 'var(--text-light)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem',
              }}>
                {p === 7 ? '7d' : p === 30 ? '1 mes' : '3 meses'}
              </button>
            ))}
          </div>

          {/* SVG Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 6px 2px', marginBottom: 14 }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map(t => {
                const y = PAD.top + t * CH
                const label = (yMax - t * (yMax - yMin)).toFixed(cfg.step < 1 ? 1 : 0)
                return (
                  <g key={t}>
                    <line x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y}
                      stroke="rgba(0,0,0,0.08)" strokeWidth={1} strokeDasharray={t > 0 ? '3 3' : ''} />
                    <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#aaa">{label}</text>
                  </g>
                )
              })}

              {/* Main line (systolic / principal) */}
              {pathMain && (
                <path d={pathMain} fill="none" stroke={latestColor} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Secondary line (diastolic) */}
              {pathTwo && (
                <path d={pathTwo} fill="none" stroke="#2196F3" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
              )}

              {/* Dots */}
              {plotData.map((pt, i) => {
                if (pt.value == null) return null
                const color = cfg.colorFn(pt.value, pt.value2 ?? undefined)
                return (
                  <g key={pt.date}>
                    <circle cx={xOf(i)} cy={yOf(pt.value)} r={period === 90 ? 2.5 : 3.5}
                      fill={color} stroke="#fff" strokeWidth={1.5} />
                    {cfg.hasTwo && pt.value2 != null && (
                      <circle cx={xOf(i)} cy={yOf(pt.value2)} r={period === 90 ? 2 : 3}
                        fill="#2196F3" stroke="#fff" strokeWidth={1.5} />
                    )}
                  </g>
                )
              })}

              {/* X-axis labels */}
              {plotData.map((pt, i) => {
                if (i % step !== 0) return null
                const d = new Date(pt.date + 'T00:00')
                return (
                  <text key={pt.date} x={xOf(i)} y={H - PAD.bottom + 14}
                    textAnchor="middle" fontSize={9} fill="#aaa">
                    {`${d.getDate()}/${d.getMonth() + 1}`}
                  </text>
                )
              })}
            </svg>
            {cfg.hasTwo && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 8, fontSize: '0.72rem', color: 'var(--text-light)' }}>
                <span style={{ color: latestColor, fontWeight: 700 }}>● Sistólica</span>
                <span style={{ color: '#2196F3', fontWeight: 700 }}>- - Diastólica</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Promedio', value: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(cfg.step < 1 ? 1 : 0) : '—' },
              { label: 'Mínimo',   value: vals.length ? Math.min(...vals).toFixed(cfg.step < 1 ? 1 : 0) : '—' },
              { label: 'Máximo',   value: vals.length ? Math.max(...vals).toFixed(cfg.step < 1 ? 1 : 0) : '—' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent readings list */}
      {signs.length > 0 && (
        <div className="card">
          <h3 className="card-title">📋 Registros recientes</h3>
          <ul className="item-list">
            {signs.slice(0, 15).map(s => {
              const color = cfg.colorFn(s.value, s.value2)
              return (
                <li key={s.id} className="item-row">
                  <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                  <div className="item-body">
                    <div className="item-title" style={{ color }}>
                      {cfg.hasTwo ? `${s.value}/${s.value2}` : s.value.toFixed(cfg.step < 1 ? 1 : 0)} {cfg.unit}
                    </div>
                    <div className="item-sub">
                      {new Date(s.date + 'T00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.time}
                      {s.notes && ` · ${s.notes}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ padding: '6px 8px', background: '#FFECEC', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}
                  >🗑</button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Modal: registrar */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{cfg.icon} Registrar {cfg.label}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Hora</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: cfg.hasTwo ? '1fr 1fr' : '1fr', gap: 10, marginTop: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>{cfg.hasTwo ? `${cfg.placeholder} (${cfg.unit})` : `${cfg.label} (${cfg.unit})`}</label>
                <input type="number" inputMode="decimal"
                  step={cfg.step} min={cfg.min} max={cfg.max}
                  value={value} onChange={e => setValue(e.target.value)}
                  placeholder={cfg.placeholder}
                  style={{ fontSize: '1.3rem', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              {cfg.hasTwo && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{cfg.twoLabel} ({cfg.unit})</label>
                  <input type="number" inputMode="decimal"
                    step={1} min={40} max={140}
                    value={value2} onChange={e => setValue2(e.target.value)}
                    placeholder={cfg.placeholder2}
                    style={{ fontSize: '1.3rem', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: después de comer, en reposo..." />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => { setShowForm(false); resetForm() }} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
