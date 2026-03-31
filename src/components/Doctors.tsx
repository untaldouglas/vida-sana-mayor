import { useState, useEffect } from 'react'
import { getDoctors, saveDoctor, deleteDoctor, getMedicalRecord, generateId, getTags, saveTag, setEntityTags, getEntityTags } from '../storage'
import type { Doctor, Diagnosis, Profile, Tag } from '../types'
import ImagePicker, { ImageThumbs } from './ImagePicker'
import TagPicker from './TagPicker'

interface DoctorsProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

const SPECIALTIES = ['Médico general', 'Internista', 'Cardiólogo', 'Endocrinólogo', 'Oncólogo', 'Neurólogo', 'Reumatólogo', 'Neumólogo', 'Nefrólogo', 'Gastroenterólogo', 'Psiquiatra', 'Geriatra', 'Otro']

export default function Doctors({ profile, showToast }: DoctorsProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)

  useEffect(() => {
    Promise.all([getDoctors(profile.id), getMedicalRecord(profile.id), getTags(profile.id)])
      .then(([d, r, t]) => { setDoctors(d); setDiagnoses(r.diagnoses); setTags(t) })
  }, [profile.id])

  async function handleTagCreated(tag: Tag) {
    await saveTag(tag)
    setTags(await getTags(profile.id))
  }

  async function saveDoc(doc: Doctor, tagIds: string[]) {
    await saveDoctor({ ...doc, profileId: profile.id } as Doctor & { profileId: string })
    await setEntityTags('doctor', doc.id, tagIds)
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
                {doc.rating && doc.rating > 0 && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize: '0.9rem', filter: s <= (doc.rating ?? 0) ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                    ))}
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
            <ImageThumbs fileIds={doc.imageFileIds ?? []} size={52} />
          </li>
        ))}
      </ul>

      {showForm && (
        <DoctorForm
          initial={editing}
          diagnoses={diagnoses}
          profileId={profile.id}
          tags={tags}
          onTagCreated={handleTagCreated}
          onSave={saveDoc}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function DoctorForm({ initial, diagnoses, profileId, tags, onTagCreated, onSave, onClose }: {
  initial: Doctor | null
  diagnoses: Diagnosis[]
  profileId: string
  tags: Tag[]
  onTagCreated: (t: Tag) => void
  onSave: (d: Doctor, tagIds: string[]) => void
  onClose: () => void
}) {
  const [entityId] = useState(() => initial?.id ?? generateId())
  const [name, setName] = useState(initial?.name ?? '')
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [diagnosisIds, setDiagnosisIds] = useState<string[]>(initial?.diagnosisIds ?? [])
  const [imageFileIds, setImageFileIds] = useState<string[]>(initial?.imageFileIds ?? [])
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [ratingNotes, setRatingNotes] = useState(initial?.ratingNotes ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  useEffect(() => {
    if (initial?.id) {
      getEntityTags('doctor', initial.id).then(t => setSelectedTagIds(t.map(x => x.id)))
    }
  }, [initial?.id])

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
        <div className="form-group">
          <ImagePicker
            profileId={profileId}
            fileIds={imageFileIds}
            onChange={setImageFileIds}
            label="📷 Fotos (credencial, consultorio, indicaciones)"
            maxImages={4}
          />
        </div>
        <div className="form-group">
          <label>⭐ Calificación del doctor</label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[1,2,3,4,5].map(star => (
              <button key={star} type="button" onClick={() => setRating(star === rating ? 0 : star)}
                style={{ fontSize: '1.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: 2, minHeight: 'unset', filter: star <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'filter 0.15s' }}>⭐</button>
            ))}
            {rating > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: 4 }}>{rating}/5</span>}
          </div>
          {rating > 0 && (
            <input type="text" value={ratingNotes} onChange={e => setRatingNotes(e.target.value)} placeholder="¿Por qué le diste esta calificación?" style={{ marginTop: 8 }} />
          )}
        </div>
        <div className="form-group">
          <label>🏷️ Etiquetas</label>
          <TagPicker tags={tags} selectedIds={selectedTagIds} profileId={profileId} onChange={setSelectedTagIds} onTagCreated={onTagCreated} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave({ id: entityId, name, specialty, phone: phone || undefined, address: address || undefined, notes: notes || undefined, diagnosisIds, imageFileIds: imageFileIds.length > 0 ? imageFileIds : undefined, rating: rating > 0 ? rating : undefined, ratingNotes: ratingNotes.trim() || undefined }, selectedTagIds)} disabled={!name} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}
