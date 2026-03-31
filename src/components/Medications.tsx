import { useState, useEffect } from 'react'
import { getMedicalRecord, saveMedicalRecord, getDoctors, saveDoctor, generateId, speak, updateProgress } from '../storage'
import type { Medication, MedicalRecord, Consultation, Doctor, Profile } from '../types'
import ImagePicker, { ImageThumbs } from './ImagePicker'
import DoctorSelector from './DoctorSelector'

interface MedicationsProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

export default function Medications({ profile, showToast }: MedicationsProps) {
  const [record, setRecord]   = useState<MedicalRecord | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Medication | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    getMedicalRecord(profile.id).then(setRecord)
    getDoctors(profile.id).then(setDoctors)
  }, [profile.id])

  async function takeMed(medId: string) {
    if (!record) return
    const now = new Date()
    const updatedMeds = record.medications.map(m => {
      if (m.id !== medId) return m
      return {
        ...m,
        lastTaken: now.toISOString(),
        stock: Math.max(0, m.stock - 1),
        takenHistory: [...m.takenHistory, {
          date: today,
          time: now.toTimeString().slice(0, 5),
          taken: true
        }]
      }
    })
    const updated = { ...record, medications: updatedMeds }
    setRecord(updated)

    try {
      await saveMedicalRecord(updated)
    } catch (e) {
      showToast('⚠️ Error al registrar', 'error')
      return
    }

    // Progreso auxiliar: no bloquea el toast de éxito
    updateProgress(profile.id).catch(e => console.warn('updateProgress falló:', e))

    const med = record.medications.find(m => m.id === medId)
    speak(`¡Muy bien! Registré que tomaste ${med?.name}.`)
    showToast(`✅ ${med?.name} registrado`, 'success')
  }

  async function saveMed(med: Medication, newDoctor?: Doctor & { profileId: string }) {
    if (!record) return
    if (newDoctor) {
      await saveDoctor(newDoctor)
      setDoctors(await getDoctors(profile.id))
    }
    const isNew = !record.medications.find(m => m.id === med.id)
    const updatedMeds = isNew
      ? [...record.medications, med]
      : record.medications.map(m => m.id === med.id ? med : m)
    const updated = { ...record, medications: updatedMeds }
    setRecord(updated)
    await saveMedicalRecord(updated)
    setShowForm(false)
    setEditing(null)
    showToast(isNew ? '💊 Medicamento añadido' : '✏️ Medicamento actualizado', 'success')
  }

  async function deleteMed(medId: string) {
    if (!record) return
    const updated = { ...record, medications: record.medications.filter(m => m.id !== medId) }
    setRecord(updated)
    await saveMedicalRecord(updated)
    showToast('🗑 Medicamento eliminado')
  }

  if (!record) return <p className="text-muted text-center mt-24">Cargando...</p>

  const activeMeds = record.medications.filter(m => !m.endDate || m.endDate >= today)
  const pastMeds = record.medications.filter(m => m.endDate && m.endDate < today)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>💊 Medicamentos</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Añadir
        </button>
      </div>

      {activeMeds.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💊</div>
          <p className="text-muted">No hay medicamentos registrados</p>
          <button className="btn btn-primary mt-16" onClick={() => setShowForm(true)}>
            Añadir primer medicamento
          </button>
        </div>
      )}

      {activeMeds.length > 0 && (
        <div className="card">
          <h3 className="card-title">Medicamentos activos</h3>
          <ul className="item-list">
            {activeMeds.map(med => {
              const takenToday = med.takenHistory.some(r => r.date === today && r.taken)
              const lowStock = med.stock <= med.stockAlert
              return (
                <li key={med.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.8rem' }}>{takenToday ? '✅' : '💊'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{med.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        {med.dose} · {med.frequency}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        Horario: {med.times.join(' · ')}
                      </div>
                      {med.prescribingDoctorId && (() => {
                        const dr = doctors.find(d => d.id === med.prescribingDoctorId)
                        return dr ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--olive-dark)', marginTop: 2 }}>
                            👨‍⚕️ Dr. {dr.name}
                          </div>
                        ) : null
                      })()}
                      {!med.prescribingDoctorId && med.prescriptionSource && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2 }}>
                          📝 {med.prescriptionSource}
                        </div>
                      )}
                      {lowStock && (
                        <div style={{ color: '#D4820A', fontWeight: 700, fontSize: '0.85rem', marginTop: 3 }}>
                          ⚠️ Solo quedan {med.stock} {med.stock === 1 ? 'píldora' : 'píldoras'}
                        </div>
                      )}
                      <ImageThumbs fileIds={med.imageFileIds ?? []} size={48} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => { setEditing(med); setShowForm(true) }}
                        style={{ padding: '6px 10px', minHeight: 36, background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => deleteMed(med.id)}
                        style={{ padding: '6px 10px', minHeight: 36, background: '#FFECEC', border: '1px solid #FFCDD2' }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  {!takenToday && (
                    <button
                      className="btn btn-sun btn-full mt-8"
                      onClick={() => takeMed(med.id)}
                    >
                      ✅ Ya la tomé
                    </button>
                  )}
                  {takenToday && (
                    <p style={{ textAlign: 'center', color: 'var(--olive-dark)', fontWeight: 700, fontSize: '0.9rem', marginTop: 8 }}>
                      ¡Toma registrada hoy! 🌟
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {pastMeds.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ fontSize: '0.95rem', color: 'var(--text-light)' }}>
            Medicamentos anteriores
          </h3>
          <ul className="item-list">
            {pastMeds.map(med => (
              <li key={med.id} className="item-row" style={{ opacity: 0.6 }}>
                <span className="item-icon">📦</span>
                <div className="item-body">
                  <div className="item-title">{med.name} – {med.dose}</div>
                  <div className="item-sub">Terminó: {med.endDate}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <MedForm
          initial={editing}
          profileId={profile.id}
          doctors={doctors}
          consultations={record?.consultations ?? []}
          onSave={saveMed}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ---- Formulario de medicamento ----
const PRESCRIPTION_SOURCES = ['Auto-medicado', 'Recomendación del farmacéutico', 'Indicación de enfermería', 'Otro']

function MedForm({ initial, profileId, doctors, consultations, onSave, onClose }: {
  initial: Medication | null
  profileId: string
  doctors: Doctor[]
  consultations: Consultation[]
  onSave: (med: Medication, newDoctor?: Doctor & { profileId: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [dose, setDose] = useState(initial?.dose ?? '')
  const [frequency, setFrequency] = useState(initial?.frequency ?? '')
  const [timesStr, setTimesStr] = useState(initial?.times.join(', ') ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [stock, setStock] = useState(String(initial?.stock ?? 30))
  const [stockAlert, setStockAlert] = useState(String(initial?.stockAlert ?? 5))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [imageFileIds, setImageFileIds] = useState<string[]>(initial?.imageFileIds ?? [])
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  // Doctor recetante
  const [prescribingDoctorId, setPrescribingDoctorId]   = useState<string | undefined>(initial?.prescribingDoctorId)
  const [pendingDoctor, setPendingDoctor]                = useState<(Doctor & { profileId: string }) | undefined>()
  const [prescriptionSource, setPrescriptionSource]     = useState(initial?.prescriptionSource ?? '')
  // Consulta de origen
  const [prescribingConsultationId, setPrescribingConsultationId] = useState(initial?.prescribingConsultationId ?? '')

  function handleDoctorSelect(id: string | undefined, nd?: Doctor & { profileId: string }) {
    setPrescribingDoctorId(id)
    setPendingDoctor(nd)
    // Si se elige doctor, limpiar la fuente sin receta
    if (id) setPrescriptionSource('')
  }

  function save() {
    const med: Medication = {
      id: initial?.id ?? generateId(),
      name: name.trim(), dose: dose.trim(), frequency: frequency.trim(),
      times: timesStr.split(',').map(t => t.trim()).filter(Boolean),
      startDate, endDate: endDate || undefined,
      stock: parseInt(stock) || 0, stockAlert: parseInt(stockAlert) || 5,
      prescribingDoctorId: prescribingDoctorId || undefined,
      prescriptionSource:  !prescribingDoctorId && prescriptionSource.trim()
                             ? prescriptionSource.trim() : undefined,
      prescribingConsultationId: prescribingConsultationId || undefined,
      notes: notes.trim() || undefined,
      lastTaken: initial?.lastTaken,
      takenHistory: initial?.takenHistory ?? [],
      imageFileIds: imageFileIds.length > 0 ? imageFileIds : undefined,
      rating: rating > 0 ? rating : undefined
    }
    onSave(med, pendingDoctor)
  }

  const FREQ_SUGGESTIONS = ['Una vez al día', 'Dos veces al día', 'Cada 8 horas', 'Cada 12 horas', 'Según necesidad']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">💊 {initial ? 'Editar' : 'Nuevo'} medicamento</h2>

        <div className="form-group">
          <label>Nombre del medicamento *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Metformina" autoFocus />
        </div>
        <div className="form-group">
          <label>Dosis *</label>
          <input type="text" value={dose} onChange={e => setDose(e.target.value)} placeholder="Ej: 500mg" />
        </div>
        <div className="form-group">
          <label>Frecuencia *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {FREQ_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setFrequency(s)}
                style={{ padding: '6px 12px', borderRadius: 20, border: `2px solid ${frequency === s ? '#8A9A5B' : '#D4C9A8'}`,
                  background: frequency === s ? 'rgba(138,154,91,0.15)' : '#FDFAF3', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font)', color: '#3D3520' }}>
                {s}
              </button>
            ))}
          </div>
          <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="O escribe..." />
        </div>
        <div className="form-group">
          <label>Horarios (separados por coma)</label>
          <input type="text" value={timesStr} onChange={e => setTimesStr(e.target.value)} placeholder="Ej: 08:00, 14:00, 22:00" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Fecha inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fecha fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Stock (unidades)</label>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Alerta cuando queden</label>
            <input type="number" min="0" value={stockAlert} onChange={e => setStockAlert(e.target.value)} />
          </div>
        </div>
        {/* ── Doctor recetante ───────────────────────────────── */}
        <div className="form-group">
          <label>Doctor que recetó</label>
          <DoctorSelector
            doctors={doctors} profileId={profileId}
            doctorId={prescribingDoctorId} onSelect={handleDoctorSelect}
          />
          {/* Fuente sin doctor (solo visible cuando no hay doctor seleccionado) */}
          {!prescribingDoctorId && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                ¿Cómo se obtuvo? (si no es recetada por doctor)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {PRESCRIPTION_SOURCES.map(s => (
                  <button key={s} type="button" onClick={() => setPrescriptionSource(prescriptionSource === s ? '' : s)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, cursor: 'pointer', minHeight: 'unset',
                      border: `2px solid ${prescriptionSource === s ? '#8A9A5B' : '#D4C9A8'}`,
                      background: prescriptionSource === s ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                      fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font)'
                    }}
                  >{s}</button>
                ))}
              </div>
              <input type="text" value={prescriptionSource}
                onChange={e => setPrescriptionSource(e.target.value)}
                placeholder="O escribe (ej: indicación de enfermería)..."
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          )}
        </div>

        {/* ── Consulta de origen (opcional) ──────────────────── */}
        {consultations.length > 0 && (
          <div className="form-group">
            <label>Consulta en que se recetó (opcional)</label>
            <select value={prescribingConsultationId} onChange={e => setPrescribingConsultationId(e.target.value)}>
              <option value="">— Ninguna —</option>
              {[...consultations].sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                <option key={c.id} value={c.id}>
                  {c.date} · {c.reason.slice(0, 40)}{c.reason.length > 40 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Indicaciones especiales..." />
        </div>

        <div className="form-group">
          <ImagePicker
            profileId={profileId}
            fileIds={imageFileIds}
            onChange={setImageFileIds}
            label="📷 Fotos (caja, receta, indicaciones)"
            maxImages={4}
          />
        </div>

        <div className="form-group">
          <label>⭐ Calificación del medicamento</label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[1,2,3,4,5].map(star => (
              <button key={star} type="button" onClick={() => setRating(star === rating ? 0 : star)}
                style={{ fontSize: '1.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: 2, minHeight: 'unset', filter: star <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'filter 0.15s' }}>⭐</button>
            ))}
            {rating > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: 4 }}>{rating}/5</span>}
          </div>
          {rating === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 4 }}>¿Qué tan efectivo/tolerable es?</p>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={!name || !dose} style={{ flex: 2 }}>
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
