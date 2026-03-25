// ============================================================
// MedicalExams – Gestión de exámenes médicos especiales
// Laboratorios, radiología y procedimientos (PET, endoscopías, etc.)
// ============================================================
import { useState, useEffect, useRef } from 'react'
import {
  getMedicalExams, saveMedicalExam, deleteMedicalExam,
  getDoctors, getServiceProviders, generateId, saveMedia, getMedia, deleteMedia, speak
} from '../storage'
import type { MedicalExam, ExamCategory, ExamStatus, Profile, Doctor, ServiceProvider, MediaFile, AIConfig } from '../types'
import { callAI } from '../services/aiService'
import ImagePicker, { ImageThumbs } from './ImagePicker'

interface MedicalExamsProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
  aiConfig?: AIConfig | null
}

const CATEGORY_LABELS: Record<ExamCategory, string> = {
  laboratorio: '🔬 Laboratorio',
  radiologia: '🩻 Radiología',
  procedimiento: '🔭 Procedimiento'
}

const STATUS_LABELS: Record<ExamStatus, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente',   color: '#FFC107' },
  en_proceso:  { label: 'En proceso',  color: '#2196F3' },
  completado:  { label: 'Completado',  color: '#4CAF50' },
  cancelado:   { label: 'Cancelado',   color: '#9E9E9E' },
}

const EXAM_SUGGESTIONS: Record<ExamCategory, string[]> = {
  laboratorio: [
    'Hemograma completo', 'Química sanguínea', 'Glucosa en ayuno', 'HbA1c',
    'Perfil lipídico', 'Función renal (BUN/Creatinina)', 'Función hepática',
    'Urianálisis', 'Cultivo de orina', 'PCR (Proteína C Reactiva)',
    'Hormona tiroidea (TSH/T4)', 'Vitamina D', 'Vitamina B12',
    'Ferritina/Hierro sérico', 'Coagulación (TP/TTP)', 'Electrolitos séricos',
    'Marcadores tumorales', 'Exudado faríngeo'
  ],
  radiologia: [
    'Rayos X de tórax', 'Rayos X de columna', 'Rayos X de pelvis',
    'Ultrasonido abdominal', 'Ultrasonido pélvico', 'Ultrasonido tiroideo',
    'TAC de tórax', 'TAC de abdomen y pelvis', 'TAC de cráneo',
    'Resonancia magnética de cerebro', 'Resonancia magnética de columna',
    'Resonancia magnética de rodilla', 'Mamografía',
    'Densitometría ósea (DEXA)', 'PET scan', 'Gammagrafía ósea',
    'Ecocardiograma', 'Doppler venoso/arterial'
  ],
  procedimiento: [
    'Endoscopía alta (panendoscopía)', 'Colonoscopía', 'Sigmoidoscopía',
    'Broncoscopía', 'Cistoscopía', 'Ecoendoscopía',
    'Biopsia (especificar sitio)', 'Punción lumbar',
    'Aplicación de yodo radioactivo (I-131)', 'Cápsula endoscópica',
    'Cateterismo cardíaco', 'Coronariografía',
    'Prueba de esfuerzo', 'Holter de 24 horas',
    'Electrocardiograma (ECG)', 'Espirometría',
    'Electroencefalograma (EEG)', 'Electromiografía (EMG)',
    'Amniocentesis', 'Biopsia de médula ósea'
  ]
}

// ---- Componente estrellitas ----
function StarRating({ value, onChange, size = '1.6rem' }: {
  value: number
  onChange?: (v: number) => void
  size?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star === value ? 0 : star)}
          style={{
            fontSize: size, background: 'none', border: 'none',
            cursor: onChange ? 'pointer' : 'default',
            padding: 2, minHeight: 'unset',
            filter: star <= value ? 'none' : 'grayscale(1) opacity(0.3)',
            transition: 'filter 0.15s'
          }}
          title={onChange ? `${star} estrella${star > 1 ? 's' : ''}` : undefined}
        >
          ⭐
        </button>
      ))}
      {value > 0 && onChange && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', alignSelf: 'center', marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  )
}

export default function MedicalExams({ profile, showToast, aiConfig }: MedicalExamsProps) {
  const [exams, setExams] = useState<MedicalExam[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [filter, setFilter] = useState<ExamCategory | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MedicalExam | null>(null)

  useEffect(() => {
    Promise.all([
      getMedicalExams(profile.id),
      getDoctors(profile.id),
      getServiceProviders(profile.id)
    ]).then(([e, d, p]) => {
      setExams(e); setDoctors(d); setProviders(p)
    })
  }, [profile.id])

  async function saveExam(exam: MedicalExam) {
    await saveMedicalExam(exam)
    const updated = await getMedicalExams(profile.id)
    setExams(updated)
    setShowForm(false)
    setEditing(null)
    showToast('🔬 Examen guardado', 'success')
    speak('Examen médico guardado correctamente.')
  }

  async function removeExam(id: string) {
    await deleteMedicalExam(id)
    setExams(prev => prev.filter(e => e.id !== id))
    showToast('🗑 Examen eliminado')
  }

  const filtered = filter === 'todos' ? exams : exams.filter(e => e.category === filter)

  const counts = {
    todos: exams.length,
    laboratorio: exams.filter(e => e.category === 'laboratorio').length,
    radiologia: exams.filter(e => e.category === 'radiologia').length,
    procedimiento: exams.filter(e => e.category === 'procedimiento').length,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>🔬 Exámenes médicos</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {(['todos', 'laboratorio', 'radiologia', 'procedimiento'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 20,
              border: `2px solid ${filter === cat ? 'var(--olive)' : 'var(--border)'}`,
              background: filter === cat ? 'rgba(138,154,91,0.15)' : 'var(--bg-card)',
              cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem',
              fontWeight: 700, color: filter === cat ? 'var(--olive-dark)' : 'var(--text-light)',
              transition: 'all 0.15s'
            }}
          >
            {cat === 'todos' ? `Todos (${counts.todos})` :
             cat === 'laboratorio' ? `🔬 Lab (${counts.laboratorio})` :
             cat === 'radiologia' ? `🩻 Radiología (${counts.radiologia})` :
             `🔭 Procedimientos (${counts.procedimiento})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔬</div>
          <p className="text-muted">No hay exámenes registrados{filter !== 'todos' ? ' en esta categoría' : ''}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            Registrar primer examen
          </button>
        </div>
      )}

      <ul className="item-list">
        {filtered.map(exam => {
          const statusInfo = STATUS_LABELS[exam.status]
          return (
            <li key={exam.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '2rem', marginTop: 2 }}>
                  {exam.category === 'laboratorio' ? '🔬' : exam.category === 'radiologia' ? '🩻' : '🔭'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{exam.examType}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2 }}>
                    {CATEGORY_LABELS[exam.category]} · {exam.date}
                  </div>
                  {exam.providerName && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>🏥 {exam.providerName}</div>
                  )}
                  {exam.doctorName && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>👨‍⚕️ Dr. {exam.doctorName}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700,
                      background: `${statusInfo.color}22`, color: statusInfo.color, border: `1px solid ${statusInfo.color}55`
                    }}>
                      {statusInfo.label}
                    </span>
                    {exam.rating && exam.rating > 0 && (
                      <StarRating value={exam.rating} size="1rem" />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => { setEditing(exam); setShowForm(true) }}
                    style={{ padding: '6px 10px', minHeight: 36 }}
                  >✏️</button>
                  <button
                    className="btn btn-sm"
                    onClick={() => removeExam(exam.id)}
                    style={{ padding: '6px 10px', minHeight: 36, background: '#FFECEC', border: 'none', borderRadius: 8 }}
                  >🗑</button>
                </div>
              </div>
              {exam.result && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(138,154,91,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--olive-dark)', marginBottom: 2 }}>Resultado:</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{exam.result}</div>
                </div>
              )}
              {exam.aiSummary && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(244,196,48,0.1)', borderRadius: 8, borderLeft: '3px solid var(--sun)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: 2 }}>✨ Resumen IA:</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text)' }}>{exam.aiSummary}</div>
                </div>
              )}
              {exam.userNotes && (
                <p style={{ fontSize: '0.83rem', color: 'var(--text-light)', marginTop: 6 }}>📝 {exam.userNotes}</p>
              )}
              <ImageThumbs fileIds={exam.imageFileIds ?? []} size={52} />
            </li>
          )
        })}
      </ul>

      {showForm && (
        <ExamForm
          initial={editing}
          profileId={profile.id}
          doctors={doctors}
          providers={providers}
          aiConfig={aiConfig}
          onSave={saveExam}
          onClose={() => { setShowForm(false); setEditing(null) }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ---- Formulario ----
function ExamForm({ initial, profileId, doctors, providers, aiConfig, onSave, onClose, showToast }: {
  initial: MedicalExam | null
  profileId: string
  doctors: Doctor[]
  providers: ServiceProvider[]
  aiConfig?: AIConfig | null
  onSave: (exam: MedicalExam) => void
  onClose: () => void
  showToast: (msg: string, type?: string) => void
}) {
  const [category, setCategory] = useState<ExamCategory>(initial?.category ?? 'laboratorio')
  const [examType, setExamType] = useState(initial?.examType ?? '')
  const [customType, setCustomType] = useState('')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<ExamStatus>(initial?.status ?? 'pendiente')
  const [doctorId, setDoctorId] = useState(initial?.doctorId ?? '')
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? '')
  const [providerId, setProviderId] = useState(initial?.providerId ?? '')
  const [providerName, setProviderName] = useState(initial?.providerName ?? '')
  const [indication, setIndication] = useState(initial?.indication ?? '')
  const [result, setResult] = useState(initial?.result ?? '')
  const [interpretation, setInterpretation] = useState(initial?.interpretation ?? '')
  const [userNotes, setUserNotes] = useState(initial?.userNotes ?? '')
  const [imageFileIds, setImageFileIds] = useState<string[]>(initial?.imageFileIds ?? [])
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [aiSummary, setAiSummary] = useState(initial?.aiSummary ?? '')
  const [generatingAI, setGeneratingAI] = useState(false)

  // Audio
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioFileId, setAudioFileId] = useState<string | undefined>(initial?.audioFileId)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setMediaRecorder(mr)
      setRecording(true)
    } catch {
      showToast('⚠️ No se pudo acceder al micrófono', 'warning')
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    setRecording(false)
    setMediaRecorder(null)
  }

  async function generateAISummary() {
    if (!aiConfig) return
    setGeneratingAI(true)
    try {
      const context = [
        `Tipo de examen: ${examType}`,
        `Categoría: ${category === 'laboratorio' ? 'Laboratorio clínico' : category === 'radiologia' ? 'Radiología' : 'Procedimiento especial'}`,
        `Fecha: ${date}`,
        indication && `Indicación médica: ${indication}`,
        result && `Resultado: ${result}`,
        interpretation && `Interpretación: ${interpretation}`,
        userNotes && `Notas del paciente: ${userNotes}`,
      ].filter(Boolean).join('\n')
      const res = await callAI(
        [{ role: 'user', content: `Genera un resumen médico claro y útil para el paciente:\n\n${context}` }],
        aiConfig,
        'Eres un asistente de salud para adultos mayores con enfermedades crónicas. Genera resúmenes concisos en español, con lenguaje accesible. No hagas diagnósticos nuevos, solo resume la información disponible. Usa viñetas o puntos breves.'
      )
      setAiSummary(res.content)
    } catch (e) {
      showToast(`⚠️ Error IA: ${(e as Error).message}`, 'error')
    }
    setGeneratingAI(false)
  }

  async function handleSave() {
    if (!examType) return
    let finalAudioId = audioFileId
    if (audioBlob && !audioFileId) {
      const buf = await audioBlob.arrayBuffer()
      const mf: MediaFile = {
        id: generateId(), profileId, type: 'audio',
        mimeType: 'audio/webm', name: `nota-examen-${Date.now()}.webm`,
        createdAt: new Date().toISOString(), data: buf
      }
      await saveMedia(mf)
      finalAudioId = mf.id
    }
    const selectedDoctor = doctors.find(d => d.id === doctorId)
    const selectedProvider = providers.find(p => p.id === providerId)
    onSave({
      id: initial?.id ?? generateId(),
      profileId,
      category,
      examType: examType === '__custom__' ? customType.trim() : examType,
      date, status,
      doctorId: selectedDoctor?.id,
      doctorName: selectedDoctor?.name ?? (doctorName || undefined),
      providerId: selectedProvider?.id,
      providerName: selectedProvider?.name ?? (providerName || undefined),
      indication: indication.trim() || undefined,
      result: result.trim() || undefined,
      interpretation: interpretation.trim() || undefined,
      userNotes: userNotes.trim() || undefined,
      audioFileId: finalAudioId,
      aiSummary: aiSummary.trim() || undefined,
      imageFileIds: imageFileIds.length > 0 ? imageFileIds : undefined,
      rating: rating > 0 ? rating : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString()
    })
  }

  async function removeAudio() {
    if (audioFileId) await deleteMedia(audioFileId)
    setAudioFileId(undefined)
    setAudioBlob(null)
  }

  const suggestions = EXAM_SUGGESTIONS[category]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🔬 {initial ? 'Editar' : 'Nuevo'} examen</h2>

        {/* Categoría */}
        <div className="form-group">
          <label>Tipo de examen *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['laboratorio', 'radiologia', 'procedimiento'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => { setCategory(cat); setExamType('') }}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10,
                  border: `2px solid ${category === cat ? 'var(--olive)' : 'var(--border)'}`,
                  background: category === cat ? 'rgba(138,154,91,0.15)' : 'var(--bg-card)',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.75rem',
                  fontWeight: 700, color: category === cat ? 'var(--olive-dark)' : 'var(--text-light)',
                  transition: 'all 0.15s', textAlign: 'center'
                }}
              >
                {cat === 'laboratorio' ? '🔬\nLaboratorio' : cat === 'radiologia' ? '🩻\nRadiología' : '🔭\nProcedimiento'}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo específico */}
        <div className="form-group">
          <label>Examen específico *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, maxHeight: 130, overflowY: 'auto' }}>
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setExamType(s)}
                style={{
                  padding: '5px 11px', borderRadius: 20,
                  border: `2px solid ${examType === s ? 'var(--olive)' : 'var(--border)'}`,
                  background: examType === s ? 'rgba(138,154,91,0.15)' : 'var(--bg-card)',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.78rem',
                  fontWeight: 700, color: examType === s ? 'var(--olive-dark)' : 'var(--text)',
                  transition: 'all 0.15s'
                }}
              >{s}</button>
            ))}
            <button
              type="button"
              onClick={() => setExamType('__custom__')}
              style={{
                padding: '5px 11px', borderRadius: 20,
                border: `2px solid ${examType === '__custom__' ? 'var(--olive)' : 'var(--border)'}`,
                background: examType === '__custom__' ? 'rgba(138,154,91,0.15)' : 'var(--bg-card)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.78rem',
                fontWeight: 700, color: 'var(--text-light)'
              }}
            >✏️ Otro...</button>
          </div>
          {examType === '__custom__' && (
            <input
              type="text" value={customType} onChange={e => setCustomType(e.target.value)}
              placeholder="Escribe el nombre del examen..." autoFocus
            />
          )}
        </div>

        {/* Fecha y estado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as ExamStatus)}>
              <option value="pendiente">⏳ Pendiente</option>
              <option value="en_proceso">🔄 En proceso</option>
              <option value="completado">✅ Completado</option>
              <option value="cancelado">❌ Cancelado</option>
            </select>
          </div>
        </div>

        {/* Doctor */}
        <div className="form-group">
          <label>👨‍⚕️ Doctor que ordenó</label>
          {doctors.length > 0 ? (
            <select value={doctorId} onChange={e => {
              setDoctorId(e.target.value)
              const d = doctors.find(d => d.id === e.target.value)
              setDoctorName(d?.name ?? '')
            }}>
              <option value="">-- Seleccionar doctor --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
              <option value="__other__">Otro (escribir nombre)</option>
            </select>
          ) : null}
          {(doctorId === '__other__' || doctors.length === 0) && (
            <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Nombre del doctor" style={{ marginTop: doctors.length > 0 ? 8 : 0 }} />
          )}
        </div>

        {/* Proveedor */}
        <div className="form-group">
          <label>🏥 Lugar / Proveedor</label>
          {providers.length > 0 ? (
            <select value={providerId} onChange={e => {
              setProviderId(e.target.value)
              const p = providers.find(p => p.id === e.target.value)
              setProviderName(p?.name ?? '')
            }}>
              <option value="">-- Seleccionar proveedor --</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="__other__">Otro (escribir nombre)</option>
            </select>
          ) : null}
          {(providerId === '__other__' || providers.length === 0) && (
            <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Hospital, laboratorio, clínica..." style={{ marginTop: providers.length > 0 ? 8 : 0 }} />
          )}
        </div>

        {/* Indicación */}
        <div className="form-group">
          <label>📋 Indicación / Orden médica</label>
          <textarea value={indication} onChange={e => setIndication(e.target.value)} placeholder="¿Por qué se ordenó este examen?" style={{ minHeight: 70 }} />
        </div>

        {/* Resultado */}
        <div className="form-group">
          <label>📊 Resultado</label>
          <textarea value={result} onChange={e => setResult(e.target.value)} placeholder="Resultado obtenido del examen..." style={{ minHeight: 80 }} />
        </div>

        {/* Interpretación */}
        <div className="form-group">
          <label>🩺 Interpretación del médico</label>
          <textarea value={interpretation} onChange={e => setInterpretation(e.target.value)} placeholder="¿Qué dijo el médico sobre los resultados?" style={{ minHeight: 70 }} />
        </div>

        {/* Notas personales */}
        <div className="form-group">
          <label>📝 Mis notas personales</label>
          <textarea value={userNotes} onChange={e => setUserNotes(e.target.value)} placeholder="Observaciones, preguntas, cómo te sentiste durante el procedimiento..." style={{ minHeight: 70 }} />
        </div>

        {/* Nota de voz */}
        <div className="form-group">
          <label>🎙️ Nota de voz</label>
          {audioFileId || audioBlob ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(138,154,91,0.1)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.4rem' }}>🎵</span>
              <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)' }}>Nota de voz guardada</span>
              <button type="button" className="btn btn-sm" onClick={removeAudio} style={{ padding: '4px 10px', minHeight: 32, background: '#FFECEC', border: 'none', borderRadius: 8 }}>🗑 Quitar</button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={recording ? stopRecording : startRecording}
              style={{ width: '100%', gap: 8, background: recording ? '#FFECEC' : undefined }}
            >
              {recording ? (
                <><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#F44336', animation: 'sunPulse 1s infinite' }} /> Grabando... (toca para detener)</>
              ) : '🎙️ Grabar nota de voz'}
            </button>
          )}
        </div>

        {/* Resumen IA */}
        <div className="form-group">
          <label>✨ Resumen inteligente</label>
          {aiConfig ? (
            <div>
              <button type="button" className="btn btn-sm btn-outline" onClick={generateAISummary} disabled={generatingAI || !examType} style={{ marginBottom: 8 }}>
                {generatingAI ? '⏳ Generando...' : '✨ Generar resumen con IA'}
              </button>
              {aiSummary && (
                <textarea value={aiSummary} onChange={e => setAiSummary(e.target.value)} style={{ minHeight: 90, background: 'rgba(244,196,48,0.08)', borderColor: 'var(--sun)' }} />
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>Configura un proveedor de IA en Configuración para generar resúmenes automáticos.</p>
          )}
        </div>

        {/* Imágenes / documentos */}
        <div className="form-group">
          <ImagePicker
            profileId={profileId}
            fileIds={imageFileIds}
            onChange={setImageFileIds}
            label="📷 Fotos de resultados, radiografías, documentos"
            maxImages={8}
          />
        </div>

        {/* Calificación */}
        <div className="form-group">
          <label>⭐ Calificación de la experiencia</label>
          <StarRating value={rating} onChange={setRating} />
          {rating === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 4 }}>Toca una estrella para calificar</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!examType || (examType === '__custom__' && !customType.trim())}
            style={{ flex: 2 }}
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Utilidad: obtener audio ----
async function _getAudioUrl(id: string): Promise<string | null> {
  const mf = await getMedia(id)
  if (!mf) return null
  return URL.createObjectURL(new Blob([mf.data], { type: mf.mimeType }))
}
void _getAudioUrl
