import { useState, useEffect } from 'react'
import { getDoctors, saveDoctor, deleteDoctor, getMedicalRecord, generateId } from '../storage'
import type { Doctor, Diagnosis, Profile } from '../types'

interface DoctorsProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

const SPECIALTIES = ['Médico general', 'Internista', 'Cardiólogo', 'Endocrinólogo', 'Oncólogo', 'Neurólogo', 'Reumatólogo', 'Neumólogo', 'Nefrólogo', 'Gastroenterólogo', 'Psiquiatra', 'Geriatra', 'Otro']

export default function Doctors({ profile, showToast }: DoctorsProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)

  useEffect(() => {
    Promise.all([getDoctors(profile.id), getMedicalRecord(profile.id)])
      .then(([d, r]) => { setDoctors(d); setDiagnoses(r.diagnoses) })
  }, [profile.id])

  async function saveDoc(doc: Doctor) {
    await saveDoctor({ ...doc, profileId: profile.id } as Doctor & { profileId: string })
    const updated = await getDoctors(profile.id)
    setDoctors(updated)
    setShowForm(false)
    setEditing(null)
    showToast('👨‍⚕️ Doctor guardado', 'success')
  }

  async function removeDoc(id: string) {
    await deleteDoctor(id)
    setDoctors(prev => prev.filter(d => d.id !== id))
    showToast('🗑 Doctor eliminado')
  }

  function getDiagnosisNames(ids: string[]) {
    return ids.map(id => diagnoses.find(d => d.id === id)?.condition).filter(Boolean).join(', ')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>👨‍⚕️ Mis doctores</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>+ Añadir</button>
      </div>

      {doctors.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👨‍⚕️</div>
          <p className="text-muted">No hay doctores registrados</p>
          <button className="btn btn-primary mt-16" onClick={() => setShowForm(true)}>Añadir primer doctor</button>
        </div>
      )}

      <ul className="item-list">
        {doctors.map(doc => (
          <li key={doc.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '2rem' }}>👨‍⚕️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Dr. {doc.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{doc.specialty}</div>
                {doc.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>📞 {doc.phone}</div>}
                {doc.address && <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>📍 {doc.address}</div>}
                {doc.diagnosisIds.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--olive-dark)', marginTop: 3 }}>
                    🩺 {getDiagnosisNames(doc.diagnosisIds)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {doc.phone && (
                  <a href={`tel:${doc.phone}`} className="btn btn-sm" style={{ padding: '6px 10px', minHeight: 36, background: 'rgba(138,154,91,0.15)', border: 'none', borderRadius: 8, fontSize: '1rem', textDecoration: 'none' }}>
                    📞
                  </a>
                )}
                <button className="btn btn-sm btn-outline" onClick={() => { setEditing(doc); setShowForm(true) }} style={{ padding: '6px 10px', minHeight: 36 }}>✏️</button>
                <button className="btn btn-sm" onClick={() => removeDoc(doc.id)} style={{ padding: '6px 10px', minHeight: 36, background: '#FFECEC', border: 'none', borderRadius: 8, cursor: 'pointer' }}>🗑</button>
              </div>
            </div>
            {doc.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>{doc.notes}</p>}
          </li>
        ))}
      </ul>

      {showForm && (
        <DoctorForm
          initial={editing}
          diagnoses={diagnoses}
          onSave={saveDoc}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function DoctorForm({ initial, diagnoses, onSave, onClose }: {
  initial: Doctor | null
  diagnoses: Diagnosis[]
  onSave: (d: Doctor) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [diagnosisIds, setDiagnosisIds] = useState<string[]>(initial?.diagnosisIds ?? [])

  function toggleDiag(id: string) {
    setDiagnosisIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">👨‍⚕️ {initial ? 'Editar' : 'Nuevo'} doctor</h2>
        <div className="form-group"><label>Nombre del doctor *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: López Martínez" autoFocus /></div>
        <div className="form-group">
          <label>Especialidad</label>
          <select value={specialty} onChange={e => setSpecialty(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Teléfono</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 55 1234 5678" /></div>
        <div className="form-group"><label>Consultorio / Dirección</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} /></div>
        {diagnoses.length > 0 && (
          <div className="form-group">
            <label>Enfermedades que atiende</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {diagnoses.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={diagnosisIds.includes(d.id)} onChange={() => toggleDiag(d.id)} style={{ width: 20, height: 20, minHeight: 'unset', accentColor: '#8A9A5B' }} />
                  <span style={{ fontSize: '0.95rem' }}>{d.condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-group"><label>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Horarios, indicaciones especiales..." /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: initial?.id ?? generateId(), name, specialty, phone: phone || undefined, address: address || undefined, notes: notes || undefined, diagnosisIds })} disabled={!name} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}
