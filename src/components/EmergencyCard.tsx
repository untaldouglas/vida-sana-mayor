import { useEffect, useRef, useState } from 'react'
import { getMedicalRecord, getDoctors } from '../storage'
import type { Profile, Allergy, Diagnosis, Medication, Doctor } from '../types'

interface Props {
  profile: Profile
  onClose: () => void
}

interface EmergencyData {
  allergies: Allergy[]
  diagnoses: Diagnosis[]
  medications: Medication[]
  primaryDoctor: Doctor | null
}

const BLOOD_TYPE_COLOR: Record<string, string> = {
  'A+': '#e74c3c', 'A-': '#c0392b',
  'B+': '#2980b9', 'B-': '#1a5276',
  'AB+': '#8e44ad', 'AB-': '#6c3483',
  'O+': '#27ae60', 'O-': '#1e8449',
}

export default function EmergencyCard({ profile, onClose }: Props) {
  const [data, setData] = useState<EmergencyData | null>(null)
  const [showQr, setShowQr] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    Promise.all([getMedicalRecord(profile.id), getDoctors(profile.id)]).then(([rec, docs]) => {
      setData({
        allergies:     rec.allergies,
        diagnoses:     rec.diagnoses,
        medications:   rec.medications,
        primaryDoctor: docs[0] ?? null,
      })
    })
  }, [profile.id])

  useEffect(() => {
    if (!showQr || !data || !qrRef.current) return
    const payload = JSON.stringify({
      n: profile.name,
      bt: profile.bloodType ?? '?',
      al: data.allergies.map(a => a.substance),
      dx: data.diagnoses.map(d => d.condition),
      rx: data.medications.map(m => `${m.name} ${m.dose}`),
      ec: profile.emergencyContactName
        ? `${profile.emergencyContactName} ${profile.emergencyContactPhone ?? ''}`
        : null,
      dr: data.primaryDoctor ? `${data.primaryDoctor.name} ${data.primaryDoctor.phone ?? ''}` : null,
    })
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toCanvas(qrRef.current!, payload, {
        width: 220,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    })
  }, [showQr, data, profile])

  const btColor = profile.bloodType ? (BLOOD_TYPE_COLOR[profile.bloodType] ?? '#333') : '#888'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#fff', overflowY: 'auto',
      fontFamily: 'var(--font)',
    }}>
      {/* Header rojo de emergencia */}
      <div style={{
        background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
        padding: '20px 20px 16px',
        color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: '2.2rem' }}>🆘</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.9, letterSpacing: 1 }}>
            TARJETA DE EMERGENCIA
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{profile.name}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10,
            padding: '8px 14px', cursor: 'pointer', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem',
          }}
        >
          ✕ Cerrar
        </button>
      </div>

      <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Grupo sanguíneo */}
        <div style={{
          background: btColor, borderRadius: 14, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 16, color: '#fff',
        }}>
          <span style={{ fontSize: '2rem' }}>🩸</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>GRUPO SANGUÍNEO</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1 }}>
              {profile.bloodType ?? <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>No registrado</span>}
            </div>
          </div>
        </div>

        {/* Alergias — crítico, fondo rojo suave */}
        <Section
          icon="⚠️"
          title="ALERGIAS"
          accent="#FFECEC"
          border="#e74c3c"
          loading={!data}
          empty={data?.allergies.length === 0}
          emptyText="Sin alergias registradas"
        >
          {data?.allergies.map(a => (
            <Item key={a.id}
              primary={a.substance}
              secondary={[a.reaction, a.severity === 'severe' ? '🔴 Severa' : a.severity === 'moderate' ? '🟡 Moderada' : '🟢 Leve'].filter(Boolean).join(' · ')}
            />
          ))}
        </Section>

        {/* Medicamentos actuales */}
        <Section
          icon="💊"
          title="MEDICAMENTOS ACTUALES"
          loading={!data}
          empty={data?.medications.length === 0}
          emptyText="Sin medicamentos registrados"
        >
          {data?.medications.map(m => (
            <Item key={m.id} primary={m.name} secondary={m.dose} />
          ))}
        </Section>

        {/* Diagnósticos */}
        <Section
          icon="🩺"
          title="DIAGNÓSTICOS"
          loading={!data}
          empty={data?.diagnoses.length === 0}
          emptyText="Sin diagnósticos registrados"
        >
          {data?.diagnoses.map(d => (
            <Item key={d.id} primary={d.condition} secondary={d.icdCode ?? undefined} />
          ))}
        </Section>

        {/* Doctor */}
        {data?.primaryDoctor && (
          <Section icon="👨‍⚕️" title="MÉDICO DE CABECERA" loading={false} empty={false}>
            <Item
              primary={`${data.primaryDoctor.name}${data.primaryDoctor.specialty ? ` · ${data.primaryDoctor.specialty}` : ''}`}
              secondary={data.primaryDoctor.phone ?? undefined}
              phoneLink={data.primaryDoctor.phone ?? undefined}
            />
          </Section>
        )}

        {/* Contacto de emergencia */}
        {(profile.emergencyContactName || profile.emergencyContactPhone) && (
          <Section icon="📞" title="CONTACTO DE EMERGENCIA" loading={false} empty={false} accent="#EBF5FB" border="#2980b9">
            <Item
              primary={profile.emergencyContactName ?? ''}
              secondary={profile.emergencyContactPhone ?? undefined}
              phoneLink={profile.emergencyContactPhone ?? undefined}
            />
          </Section>
        )}

        {/* QR */}
        <div style={{ background: 'var(--bg-card,#f9f5ed)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
          <button
            onClick={() => setShowQr(v => !v)}
            style={{
              background: '#2c3e50', color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
              fontFamily: 'var(--font)',
            }}
          >
            {showQr ? '🔲 Ocultar QR' : '🔲 Mostrar código QR'}
          </button>
          {showQr && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <canvas ref={qrRef} style={{ borderRadius: 10 }} />
              <p style={{ fontSize: '0.78rem', color: '#666', margin: 0 }}>
                Escanea para ver la información de emergencia
              </p>
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#999', textAlign: 'center', margin: 0 }}>
          Generado por Vida Sana Mayor · {new Date().toLocaleDateString('es-MX')}
        </p>
      </div>
    </div>
  )
}

// ── Sub-componentes internos ──────────────────────────────────

interface SectionProps {
  icon: string
  title: string
  accent?: string
  border?: string
  loading: boolean
  empty: boolean
  emptyText?: string
  children?: React.ReactNode
}

function Section({ icon, title, accent, border, loading, empty, emptyText, children }: SectionProps) {
  return (
    <div style={{
      background: accent ?? 'var(--bg-card,#f9f5ed)',
      border: `2px solid ${border ?? 'var(--border,#e0d8c8)'}`,
      borderRadius: 14, padding: '12px 16px',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: 1, color: border ?? '#555', marginBottom: 8 }}>
        {icon} {title}
      </div>
      {loading && <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>Cargando…</p>}
      {!loading && empty && <p style={{ color: '#aaa', fontSize: '0.9rem', margin: 0 }}>{emptyText}</p>}
      {!loading && !empty && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
    </div>
  )
}

interface ItemProps {
  primary: string
  secondary?: string
  phoneLink?: string
}

function Item({ primary, secondary, phoneLink }: ItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{primary}</div>
        {secondary && <div style={{ fontSize: '0.85rem', color: '#666' }}>{secondary}</div>}
      </div>
      {phoneLink && (
        <a
          href={`tel:${phoneLink}`}
          style={{
            background: '#27ae60', color: '#fff', borderRadius: 8,
            padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          📞 Llamar
        </a>
      )}
    </div>
  )
}
