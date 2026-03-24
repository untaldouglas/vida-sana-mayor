import { useEffect, useState } from 'react'
import { getProgress, getSymptoms, getMedicalRecord } from '../storage'
import type { Profile, ProgressRecord } from '../types'

interface ProgressProps {
  profile: Profile
}

const MILESTONE_MESSAGES: Record<number, string> = {
  1: '¡Tu primer día! El camino empieza aquí. 🌱',
  3: '¡Tres días! Estás construyendo un hábito. 🌿',
  7: '¡Una semana completa! Eres increíble. 🌟',
  14: '¡Dos semanas de constancia! 💪',
  21: '¡21 días! Se dice que ya es un hábito. 🏆',
  30: '¡Un mes entero! Eres un ejemplo a seguir. ☀️',
  60: '¡Dos meses! Tu salud te lo agradece. 🌻',
  100: '¡100 días! Leyenda de la salud. 🎉',
}

const ENCOURAGEMENT = [
  'Cada registro es un acto de amor propio. 💚',
  'Tu constancia es tu mejor medicina. ☀️',
  'Estás haciendo algo increíble por tu salud. 🌟',
  'Eres más fuerte de lo que crees. 💪',
  'Tu bienestar importa. Sigue adelante. 🌻',
  'Pequeños pasos, grandes cambios. 🌱',
  'Cuidarte es la prioridad. ¡Lo estás logrando! 🎯',
]

export default function Progress({ profile }: ProgressProps) {
  const [progress, setProgress] = useState<ProgressRecord | null>(null)
  const [symptomCount, setSymptomCount] = useState(0)
  const [medCount, setMedCount] = useState(0)
  const [message] = useState(() => ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)])

  useEffect(() => {
    Promise.all([
      getProgress(profile.id),
      getSymptoms(profile.id),
      getMedicalRecord(profile.id)
    ]).then(([p, s, r]) => {
      setProgress(p)
      setSymptomCount(s.length)
      setMedCount(r.medications.length)
    })
  }, [profile.id])

  if (!progress) return <p className="text-muted text-center mt-24">Cargando...</p>

  const suns = progress.suns
  const displaySuns = Math.min(suns, 30)
  const milestone = Object.entries(MILESTONE_MESSAGES)
    .reverse()
    .find(([days]) => progress.streak >= Number(days))

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>📈 Tu progreso</h2>

      {/* Tarjeta principal */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #F4C430 0%, #D4A820 100%)', border: 'none', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>☀️</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3D3520' }}>{suns}</div>
        <div style={{ fontWeight: 700, color: '#3D3520', marginBottom: 4 }}>Soles ganados</div>
        <div style={{ fontSize: '0.9rem', color: '#5D4E1C', opacity: 0.8 }}>1 sol por cada 3 registros</div>
      </div>

      {/* Racha */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--olive-dark)' }}>{progress.streak}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 700 }}>Días seguidos</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--olive-dark)' }}>{progress.totalEntries}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 700 }}>Total registros</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--olive-dark)' }}>{symptomCount}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 700 }}>Síntomas</div>
          </div>
        </div>
      </div>

      {/* Milestone */}
      {milestone && (
        <div className="card" style={{ background: 'rgba(138,154,91,0.12)', border: '2px solid var(--olive)' }}>
          <p style={{ fontWeight: 700, color: 'var(--olive-dark)', fontSize: '1.05rem', textAlign: 'center' }}>
            🏆 {milestone[1]}
          </p>
        </div>
      )}

      {/* Mensaje motivacional */}
      <div className="card" style={{ textAlign: 'center', background: 'var(--rose)', border: '1px solid var(--rose-dark)' }}>
        <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.05rem' }}>{message}</p>
      </div>

      {/* Soles visuales */}
      {displaySuns > 0 && (
        <div className="card">
          <h3 className="card-title">☀️ Tus soles</h3>
          <div className="suns-row">
            {Array.from({ length: displaySuns }).map((_, i) => (
              <span key={i} className="sun-icon" style={{ animationDelay: `${i * 0.1}s` }}>☀️</span>
            ))}
            {suns > 30 && <span style={{ fontSize: '1.2rem', color: 'var(--text-light)', fontWeight: 700 }}>+{suns - 30}</span>}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 8 }}>
            ¡Cada sol representa 3 días de cuidado! 🌟
          </p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="card">
        <h3 className="card-title">📊 Tu historial de salud</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '😊', label: 'Síntomas registrados', value: symptomCount },
            { icon: '💊', label: 'Medicamentos activos', value: medCount },
            { icon: '📓', label: 'Días de seguimiento', value: progress.totalEntries },
            { icon: '🔥', label: 'Racha actual', value: `${progress.streak} días` },
          ].map(item => (
            <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontWeight: 800, color: 'var(--olive-dark)', fontSize: '1.1rem' }}>{item.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Últimas fechas */}
      {progress.lastEntryDate && (
        <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', marginTop: 8 }}>
          Último registro: {new Date(progress.lastEntryDate + 'T00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      )}
    </div>
  )
}
