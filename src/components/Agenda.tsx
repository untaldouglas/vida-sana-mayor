import { useState, useEffect } from 'react'
import { getAppointments, saveAppointment, deleteAppointment, getDoctors, generateId, speak } from '../storage'
import type { Appointment, Doctor, Profile } from '../types'
import ImagePicker, { ImageThumbs } from './ImagePicker'

interface AgendaProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

export default function Agenda({ profile, showToast }: AgendaProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [view, setView] = useState<'upcoming' | 'week' | 'all'>('week')

  useEffect(() => {
    Promise.all([
      getAppointments(profile.id),
      getDoctors(profile.id)
    ]).then(([a, d]) => { setAppointments(a); setDoctors(d) })
  }, [profile.id])

  const today = new Date().toISOString().split('T')[0]

  async function saveAppt(appt: Appointment) {
    await saveAppointment({ ...appt, profileId: profile.id } as Appointment & { profileId: string })
    const updated = await getAppointments(profile.id)
    setAppointments(updated)
    setShowForm(false)
    setEditing(null)
    speak(`Cita registrada para el ${appt.date} a las ${appt.time}.`)
    showToast('📅 Cita guardada', 'success')
  }

  async function removeAppt(id: string) {
    await deleteAppointment(id)
    setAppointments(prev => prev.filter(a => a.id !== id))
    showToast('🗑 Cita eliminada')
  }

  // Vista semanal: próximos 7 días
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const upcoming = appointments.filter(a => a.date >= today)
  const past = appointments.filter(a => a.date < today)

  function getDoctorName(doctorId?: string) {
    if (!doctorId) return undefined
    return doctors.find(d => d.id === doctorId)?.name
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>📅 Agenda médica</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Añadir cita
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['week', '📆 Semana'], ['upcoming', '⏳ Próximas'], ['all', '🗂 Todas']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v as typeof view)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: `2px solid ${view === v ? '#8A9A5B' : '#D4C9A8'}`,
              background: view === v ? 'rgba(138,154,91,0.15)' : '#FDFAF3', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font)', color: view === v ? '#6B7A46' : '#6B5D3F' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Vista semanal */}
      {view === 'week' && (
        <div className="week-grid">
          {weekDays.map(day => {
            const dayAppts = appointments.filter(a => a.date === day)
            const isToday = day === today
            const label = new Date(day + 'T00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
            return (
              <div key={day} className="day-card">
                <div className={`day-header ${isToday ? 'today' : ''}`}>
                  {isToday ? '⭐ ' : ''}{label.charAt(0).toUpperCase() + label.slice(1)}
                </div>
                <div className="day-body">
                  {dayAppts.length === 0
                    ? <p className="day-empty">Sin citas</p>
                    : dayAppts.map(appt => (
                      <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.2rem' }}>🏥</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{appt.time} – {appt.reason}</div>
                          {appt.doctorName && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Dr. {appt.doctorName}</div>}
                          {appt.location && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>📍 {appt.location}</div>}
                        </div>
                        <button onClick={() => removeAppt(appt.id)} style={{ background: '#FFECEC', border: 'none', borderRadius: 8, padding: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>🗑</button>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista próximas */}
      {view === 'upcoming' && (
        <div>
          {upcoming.length === 0
            ? <div className="card text-center" style={{ padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
                <p className="text-muted">No hay citas próximas</p>
                <button className="btn btn-primary mt-16" onClick={() => setShowForm(true)}>Añadir cita</button>
              </div>
            : <ul className="item-list">
                {upcoming.map(appt => (
                  <li key={appt.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="item-icon">🏥</span>
                      <div className="item-body">
                        <div className="item-title">{appt.reason}</div>
                        <div className="item-sub">
                          {new Date(appt.date + 'T00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {appt.time}
                        </div>
                        {(appt.doctorName || getDoctorName(appt.doctorId)) && (
                          <div className="item-sub">Dr. {appt.doctorName || getDoctorName(appt.doctorId)}</div>
                        )}
                        {appt.location && <div className="item-sub">📍 {appt.location}</div>}
                      </div>
                      <div className="item-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => { setEditing(appt); setShowForm(true) }} style={{ padding: '6px 8px', minHeight: 36 }}>✏️</button>
                        <button className="btn btn-sm" onClick={() => removeAppt(appt.id)} style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC', border: 'none', borderRadius: 8, cursor: 'pointer' }}>🗑</button>
                      </div>
                    </div>
                    <ImageThumbs fileIds={appt.imageFileIds ?? []} size={52} />
                  </li>
                ))}
              </ul>
          }
        </div>
      )}

      {/* Todas */}
      {view === 'all' && (
        <div>
          {upcoming.length > 0 && (
            <div className="card">
              <h3 className="card-title">Próximas</h3>
              <ul className="item-list">
                {upcoming.map(appt => (
                  <li key={appt.id} className="item-row">
                    <span className="item-icon">📅</span>
                    <div className="item-body">
                      <div className="item-title">{appt.date} {appt.time} – {appt.reason}</div>
                      {appt.doctorName && <div className="item-sub">Dr. {appt.doctorName}</div>}
                    </div>
                    <button onClick={() => removeAppt(appt.id)} style={{ background: '#FFECEC', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>🗑</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {past.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ color: 'var(--text-light)' }}>Pasadas</h3>
              <ul className="item-list">
                {past.map(appt => (
                  <li key={appt.id} className="item-row" style={{ opacity: 0.6 }}>
                    <span className="item-icon">✅</span>
                    <div className="item-body">
                      <div className="item-title">{appt.date} {appt.time} – {appt.reason}</div>
                    </div>
                    <button onClick={() => removeAppt(appt.id)} style={{ background: '#FFECEC', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>🗑</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {appointments.length === 0 && (
            <div className="card text-center" style={{ padding: 40 }}>
              <p className="text-muted">Sin citas registradas</p>
              <button className="btn btn-primary mt-16" onClick={() => setShowForm(true)}>Añadir primera cita</button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ApptForm
          initial={editing}
          doctors={doctors}
          profileId={profile.id}
          onSave={saveAppt}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function ApptForm({ initial, doctors, profileId, onSave, onClose }: {
  initial: Appointment | null
  doctors: Doctor[]
  profileId: string
  onSave: (a: Appointment) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(initial?.date ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [doctorId, setDoctorId] = useState(initial?.doctorId ?? '')
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [reminder, setReminder] = useState(initial?.reminder ?? true)
  const [reminderMinutes, setReminderMinutes] = useState(initial?.reminderMinutes ?? 60)
  const [imageFileIds, setImageFileIds] = useState<string[]>(initial?.imageFileIds ?? [])

  function save() {
    const selected = doctors.find(d => d.id === doctorId)
    onSave({
      id: initial?.id ?? generateId(),
      date, time, reason, doctorId: doctorId || undefined,
      doctorName: selected?.name || doctorName || undefined,
      location: location || undefined, notes: notes || undefined,
      reminder, reminderMinutes,
      imageFileIds: imageFileIds.length > 0 ? imageFileIds : undefined
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">📅 {initial ? 'Editar' : 'Nueva'} cita</h2>
        <div className="form-group"><label>Motivo / Tipo de cita *</label><input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Revisión general, Control diabetes..." autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Fecha *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label>Hora *</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
        {doctors.length > 0 && (
          <div className="form-group">
            <label>Doctor</label>
            <select value={doctorId} onChange={e => { setDoctorId(e.target.value); setDoctorName('') }}>
              <option value="">-- Sin doctor asignado --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name} – {d.specialty}</option>)}
            </select>
          </div>
        )}
        {!doctorId && (
          <div className="form-group"><label>Nombre del doctor</label><input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Ej: Dr. López" /></div>
        )}
        <div className="form-group"><label>Lugar / Clínica</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Hospital General" /></div>
        <div className="form-group"><label>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="form-group">
          <ImagePicker
            profileId={profileId}
            fileIds={imageFileIds}
            onChange={setImageFileIds}
            label="📷 Fotos (indicaciones, resultados, recetas)"
            maxImages={5}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="checkbox" id="reminder" checked={reminder} onChange={e => setReminder(e.target.checked)} style={{ width: 22, height: 22, minHeight: 'unset', accentColor: '#8A9A5B' }} />
          <label htmlFor="reminder" style={{ marginBottom: 0 }}>Recordatorio</label>
          {reminder && (
            <select value={reminderMinutes} onChange={e => setReminderMinutes(Number(e.target.value))} style={{ minHeight: 42, flex: 1 }}>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes</option>
              <option value={120}>2 horas antes</option>
              <option value={1440}>1 día antes</option>
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={!reason || !date || !time} style={{ flex: 2 }}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}
