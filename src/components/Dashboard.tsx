import { useEffect, useState } from 'react'
import { getMedicalRecord, getAppointments, getProgress, speak } from '../storage'
import type { Profile, MedicalRecord, Appointment, ProgressRecord, AppView, AIConfig } from '../types'
import AIFeatureInfo from './AIFeatureInfo'

interface DashboardProps {
  profile: Profile
  onNavigate: (view: AppView) => void
  aiConfig?: AIConfig | null
}

const POSITIVE_MESSAGES = [
  '¡Cada día que registras, cuidas tu salud! 🌟',
  'Estás haciendo algo increíble por ti mismo. 💚',
  '¡Tu constancia es tu mejor medicina! ☀️',
  'Registrar hoy es un acto de amor propio. 🌻',
  '¡Sigue adelante, vas muy bien! 🌿',
]

export default function Dashboard({ profile, onNavigate, aiConfig }: DashboardProps) {
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [progress, setProgress] = useState<ProgressRecord | null>(null)
  const [message] = useState(() => POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)])

  useEffect(() => {
    Promise.all([
      getMedicalRecord(profile.id),
      getAppointments(profile.id),
      getProgress(profile.id)
    ]).then(([r, a, p]) => {
      setRecord(r)
      setAppointments(a)
      setProgress(p)
    })
  }, [profile.id])

  const today = new Date().toISOString().split('T')[0]
  const upcomingAppts = appointments
    .filter(a => a.date >= today)
    .slice(0, 3)

  const activeMeds = record?.medications.filter(m => !m.endDate || m.endDate >= today) ?? []
  const lowStockMeds = activeMeds.filter(m => m.stock <= m.stockAlert)

  function greet() {
    const hour = new Date().getHours()
    const greetWord = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
    speak(`${greetWord}, ${profile.name}. ${message}`)
  }

  return (
    <div>
      {/* Saludo */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #8A9A5B 0%, #6B7A46 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4 }}>
              Hola, {profile.name} {profile.avatar}
            </h2>
            <p style={{ opacity: 0.9, fontSize: '0.9rem', marginTop: 6 }}>{message}</p>
          </div>
          <button
            onClick={greet}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12, padding: '10px 14px', fontSize: '1.5rem', cursor: 'pointer' }}
            title="Escuchar saludo"
          >
            🔊
          </button>
        </div>

        {progress && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.min(progress.suns, 7) }).map((_, i) => (
                <span key={i} style={{ fontSize: '1.3rem' }}>☀️</span>
              ))}
            </div>
            <span style={{ opacity: 0.9, fontSize: '0.85rem' }}>
              {progress.streak} días seguidos · {progress.suns} soles
            </span>
          </div>
        )}
      </div>

      {/* Alertas */}
      {lowStockMeds.length > 0 && (
        <div className="card" style={{ background: '#FFF3CD', border: '1px solid #F4C430' }}>
          <p style={{ fontWeight: 700, color: '#856404' }}>
            ⚠️ {lowStockMeds.length} medicamento{lowStockMeds.length > 1 ? 's' : ''} con poco inventario
          </p>
          {lowStockMeds.map(m => (
            <p key={m.id} style={{ fontSize: '0.9rem', color: '#856404', marginTop: 4 }}>
              • {m.name}: {m.stock} píldora{m.stock !== 1 ? 's' : ''} restante{m.stock !== 1 ? 's' : ''}
            </p>
          ))}
          <button className="btn btn-sm btn-sun mt-8" onClick={() => onNavigate('medications')}>
            Ver medicamentos
          </button>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="card">
        <h3 className="card-title">⚡ Acceso rápido</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '💊', label: 'Medicamentos', view: 'medications' as AppView },
            { icon: '📋', label: 'Expediente', view: 'record' as AppView },
            { icon: '😊', label: 'Síntomas', view: 'symptoms' as AppView },
            { icon: '📅', label: 'Agenda', view: 'agenda' as AppView },
            { icon: '👨‍⚕️', label: 'Doctores', view: 'doctors' as AppView },
            { icon: '📈', label: 'Progreso', view: 'progress' as AppView },
          ].map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 14, border: '1px solid var(--border)',
                background: 'var(--bg)', cursor: 'pointer', minHeight: 80,
                fontFamily: 'var(--font)', transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Próximas citas */}
      {upcomingAppts.length > 0 && (
        <div className="card">
          <h3 className="card-title">📅 Próximas citas</h3>
          <ul className="item-list">
            {upcomingAppts.map(appt => (
              <li key={appt.id} className="item-row">
                <span className="item-icon">🏥</span>
                <div className="item-body">
                  <div className="item-title">{appt.reason}</div>
                  <div className="item-sub">
                    {new Date(appt.date + 'T00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {appt.time}
                    {appt.doctorName && ` · Dr. ${appt.doctorName}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn btn-outline btn-sm mt-8" onClick={() => onNavigate('agenda')}>
            Ver todas las citas
          </button>
        </div>
      )}

      {/* Medicamentos del día */}
      {activeMeds.length > 0 && (
        <div className="card">
          <h3 className="card-title">💊 Medicamentos de hoy</h3>
          <ul className="item-list">
            {activeMeds.slice(0, 4).map(med => {
              const takenToday = med.takenHistory.some(r => r.date === today && r.taken)
              return (
                <li key={med.id} className="item-row" style={{ opacity: takenToday ? 0.6 : 1 }}>
                  <span className="item-icon">{takenToday ? '✅' : '💊'}</span>
                  <div className="item-body">
                    <div className="item-title">{med.name} – {med.dose}</div>
                    <div className="item-sub">{med.frequency} · {med.times.join(', ')}</div>
                  </div>
                </li>
              )
            })}
          </ul>
          <button className="btn btn-primary btn-sm mt-8" onClick={() => onNavigate('medications')}>
            Registrar toma
          </button>
        </div>
      )}

      {/* Diagnósticos activos */}
      {(record?.diagnoses ?? []).filter(d => d.status === 'active' || d.status === 'chronic').length > 0 && (
        <div className="card">
          <h3 className="card-title">🩺 Condiciones activas</h3>
          <ul className="item-list">
            {record!.diagnoses.filter(d => d.status !== 'resolved').map(diag => (
              <li key={diag.id} className="item-row">
                <span className="item-icon">{diag.status === 'chronic' ? '🔄' : '⚕️'}</span>
                <div className="item-body">
                  <div className="item-title">{diag.condition}</div>
                  <div className="item-sub">
                    {diag.status === 'chronic' ? 'Crónica' : 'Activa'}
                    {diag.icdCode && ` · CIE: ${diag.icdCode}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* IA: banner informativo */}
      {!aiConfig ? (
        <div className="card">
          <h3 className="card-title">🤖 Inteligencia Artificial disponible</h3>
          <AIFeatureInfo
            mode="banner"
            onConfigureAI={() => onNavigate('settings')}
          />
        </div>
      ) : (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(25,118,210,0.06) 0%, rgba(138,154,91,0.06) 100%)',
          border: '1.5px solid rgba(138,154,91,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>IA activa</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                {aiConfig.provider === 'ollama'
                  ? `🦙 Ollama local · ${aiConfig.model} · Sin costo`
                  : `${aiConfig.provider} · ${aiConfig.model}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
