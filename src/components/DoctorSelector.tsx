// ============================================================
// DoctorSelector – selector reutilizable de doctor
// Casos: vincular doctor existente (1:1 FK) o crear nuevo
// sin duplicar (detección por nombre, case-insensitive).
// ============================================================
import { useState, useEffect } from 'react'
import { generateId } from '../storage'
import type { Doctor } from '../types'

export type DoctorMode = 'none' | 'existing' | 'new'

const SPECIALTIES = [
  'Médico general', 'Internista', 'Cardiólogo', 'Endocrinólogo', 'Oncólogo',
  'Neurólogo', 'Reumatólogo', 'Neumólogo', 'Nefrólogo', 'Gastroenterólogo',
  'Psiquiatra', 'Geriatra', 'Otro'
]

interface DoctorSelectorProps {
  doctors: Doctor[]
  profileId: string
  /** ID del doctor actualmente vinculado (controlado desde el padre) */
  doctorId: string | undefined
  /**
   * Se invoca al cambiar la selección.
   * - mode='none'     → doctorId=undefined, newDoctor=undefined
   * - mode='existing' → doctorId=<id>, newDoctor=undefined
   * - mode='new'      → doctorId=<newId>, newDoctor=<objeto completo>
   */
  onSelect: (doctorId: string | undefined, newDoctor?: Doctor & { profileId: string }) => void
}

export default function DoctorSelector({ doctors, profileId, doctorId, onSelect }: DoctorSelectorProps) {
  const initialMode: DoctorMode = doctorId ? 'existing' : 'none'
  const [mode, setMode]             = useState<DoctorMode>(initialMode)
  const [selectedId, setSelectedId] = useState(doctorId ?? '')
  const [newName, setNewName]       = useState('')
  const [newSpecialty, setNewSpec]  = useState('')
  const [newPhone, setNewPhone]     = useState('')
  // ID estable para el nuevo doctor (no cambia en re-renders)
  const [newId]                     = useState<string>(generateId)
  const [dup, setDup]               = useState<Doctor | null>(null)

  // Detección de duplicado al escribir nombre
  useEffect(() => {
    if (!newName.trim()) { setDup(null); return }
    setDup(doctors.find(d => d.name.toLowerCase() === newName.toLowerCase().trim()) ?? null)
  }, [newName, doctors])

  function changeMode(m: DoctorMode) {
    setMode(m)
    if (m === 'none')     { onSelect(undefined) }
    if (m === 'existing') { onSelect(selectedId || undefined) }
    if (m === 'new')      { if (newName.trim()) notifyNew() }
  }

  function handleExistingChange(id: string) {
    setSelectedId(id)
    onSelect(id || undefined)
  }

  function notifyNew(
    name     = newName,
    specialty = newSpecialty,
    phone    = newPhone
  ) {
    if (!name.trim()) { onSelect(undefined); return }
    onSelect(newId, {
      id: newId, profileId,
      name:        name.trim(),
      specialty:   specialty || 'Médico general',
      phone:       phone.trim() || undefined,
      diagnosisIds: []
    })
  }

  function useDuplicate(d: Doctor) {
    setMode('existing')
    setSelectedId(d.id)
    onSelect(d.id)
  }

  return (
    <div>
      {/* Selector de modo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {([
          ['none',     'Sin doctor'],
          ['existing', '👨‍⚕️ Existente'],
          ['new',      '➕ Nuevo doctor']
        ] as [DoctorMode, string][]).map(([m, label]) => (
          <button
            key={m} type="button"
            onClick={() => changeMode(m)}
            style={{
              padding: '8px 14px', borderRadius: 20, cursor: 'pointer', minHeight: 'unset',
              border:     `2px solid ${mode === m ? '#8A9A5B' : '#D4C9A8'}`,
              background: mode === m ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
              fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font)'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Doctor existente */}
      {mode === 'existing' && (
        <select value={selectedId} onChange={e => handleExistingChange(e.target.value)}>
          <option value="">-- Seleccionar doctor --</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>Dr. {d.name} – {d.specialty}</option>
          ))}
        </select>
      )}

      {/* Nuevo doctor con detección de duplicado */}
      {mode === 'new' && (
        <div style={{ border: '1px dashed #8A9A5B', borderRadius: 10, padding: 12, background: 'rgba(138,154,91,0.05)' }}>
          {dup && (
            <div style={{
              background: '#FFF3CD', border: '1px solid #F4C430',
              borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.9rem'
            }}>
              ⚠️ Ya existe <strong>Dr. {dup.name}</strong> ({dup.specialty}).{' '}
              <button
                type="button" onClick={() => useDuplicate(dup)}
                style={{
                  background: '#8A9A5B', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 700, minHeight: 'unset'
                }}
              >
                Usar existente
              </button>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.9rem' }}>Nombre del doctor *</label>
            <input
              type="text" value={newName}
              onChange={e => { setNewName(e.target.value); notifyNew(e.target.value) }}
              placeholder="Ej: López Martínez"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.9rem' }}>Especialidad</label>
            <select value={newSpecialty} onChange={e => { setNewSpec(e.target.value); notifyNew(newName, e.target.value) }}>
              <option value="">-- Seleccionar --</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.9rem' }}>Teléfono (opcional)</label>
            <input
              type="tel" value={newPhone}
              onChange={e => { setNewPhone(e.target.value); notifyNew(newName, newSpecialty, e.target.value) }}
              placeholder="55 1234 5678"
            />
          </div>
        </div>
      )}
    </div>
  )
}
