import { useState, useEffect, useRef } from 'react'
import { getSymptoms, saveSymptom, deleteSymptom, generateId, speak, updateProgress, saveMedia } from '../storage'
import type { SymptomEntry, Profile, MediaFile } from '../types'

interface SymptomDiaryProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

const PAIN_FACES = [
  { level: 0 as const, emoji: '😊', label: 'Sin dolor', color: '#4CAF50' },
  { level: 1 as const, emoji: '😐', label: 'Leve', color: '#FFC107' },
  { level: 2 as const, emoji: '😟', label: 'Moderado', color: '#FF9800' },
  { level: 3 as const, emoji: '😣', label: 'Severo', color: '#F44336' },
]

const SYMPTOM_TAGS = ['Cansancio', 'Náusea', 'Mareo', 'Fiebre', 'Tos', 'Dificultad respirar', 'Hinchazón', 'Hormigueo', 'Pérdida apetito', 'Insomnio']

export default function SymptomDiary({ profile, showToast }: SymptomDiaryProps) {
  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcribing, setTranscribing] = useState(false)

  // Form state
  const [painLevel, setPainLevel] = useState<0|1|2|3>(0)
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSymptoms(profile.id).then(setEntries)
  }, [profile.id])

  function toggleTag(tag: string) {
    setSelectedTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        // Transcripción con Web Speech API
        await transcribeAudio()
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

  async function transcribeAudio() {
    type SRConstructor = new () => { lang: string; start: () => void; onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null }
    const w = window as Window & { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    setTranscribing(true)
    const recognition = new SR()
    recognition.lang = 'es-MX'
    recognition.onresult = (e) => {
      setTranscript(e.results[0][0].transcript)
      setTranscribing(false)
    }
    recognition.onerror = () => setTranscribing(false)
    recognition.start()
  }

  async function saveEntry() {
    const now = new Date()
    let audioFileId: string | undefined
    let photoFileId: string | undefined

    if (audioBlob) {
      try {
        const buf = await audioBlob.arrayBuffer()
        const mf: MediaFile = {
          id: generateId(), profileId: profile.id, type: 'audio',
          mimeType: 'audio/webm', name: `audio-${now.toISOString()}.webm`,
          createdAt: now.toISOString(), data: buf, transcript
        }
        await saveMedia(mf)
        audioFileId = mf.id
      } catch (e) { console.warn('Media audio no guardada:', e) }
    }

    if (photoFile) {
      try {
        const buf = await photoFile.arrayBuffer()
        const mf: MediaFile = {
          id: generateId(), profileId: profile.id, type: 'photo',
          mimeType: photoFile.type, name: photoFile.name,
          createdAt: now.toISOString(), data: buf
        }
        await saveMedia(mf)
        photoFileId = mf.id
      } catch (e) { console.warn('Media foto no guardada:', e) }
    }

    const entry: SymptomEntry = {
      id: generateId(),
      profileId: profile.id,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      painLevel,
      description: description.trim(),
      audioFileId,
      transcript: transcript || undefined,
      photoFileId,
      tags: selectedTags
    }

    try {
      await saveSymptom(entry)
    } catch (e) {
      showToast('⚠️ Error al guardar síntoma', 'error')
      return
    }

    // Progreso auxiliar: no bloquea el cierre del formulario
    updateProgress(profile.id).catch(e => console.warn('updateProgress falló:', e))

    const face = PAIN_FACES[painLevel]
    speak(`Síntoma registrado. Nivel de dolor: ${face.label}. ¡Gracias por cuidarte!`)
    showToast('😊 Síntoma registrado', 'success')

    setEntries(prev => [entry, ...prev])
    setShowForm(false)
    setPainLevel(0)
    setDescription('')
    setSelectedTags([])
    setTranscript('')
    setAudioBlob(null)
    setPhotoFile(null)
  }

  async function removeEntry(id: string) {
    await deleteSymptom(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('🗑 Entrada eliminada')
  }

  // Agrupar por fecha
  const grouped = entries.reduce<Record<string, SymptomEntry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>😊 Diario de síntomas</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Registrar</button>
      </div>

      {entries.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📓</div>
          <p className="text-muted">Aún no hay síntomas registrados</p>
          <button className="btn btn-primary mt-16" onClick={() => setShowForm(true)}>
            Registrar primer síntoma
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([date, dayEntries]) => (
        <div key={date} className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: 12 }}>
            📅 {new Date(date + 'T00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <ul className="item-list">
            {dayEntries.map(entry => {
              const face = PAIN_FACES[entry.painLevel]
              return (
                <li key={entry.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '2rem' }}>{face.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: face.color }}>{face.label} · {entry.time}</div>
                      {entry.description && <div style={{ fontSize: '0.9rem', marginTop: 3 }}>{entry.description}</div>}
                      {entry.transcript && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 3 }}>
                          🎙 "{entry.transcript}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      style={{ padding: '6px 8px', minHeight: 36, background: '#FFECEC', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}
                    >🗑</button>
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="tags-row">
                      {entry.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
                    </div>
                  )}
                  {entry.photoFileId && (
                    <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-light)' }}>📷 Foto adjunta</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh' }}>
            <h2 className="modal-title">😊 Registrar síntoma</h2>

            <div className="form-group">
              <label>¿Cómo es tu nivel de dolor ahora?</label>
              <div className="pain-scale">
                {PAIN_FACES.map(f => (
                  <button
                    key={f.level}
                    className={`pain-btn p${f.level} ${painLevel === f.level ? 'selected' : ''}`}
                    onClick={() => setPainLevel(f.level)}
                  >
                    <span className="pain-emoji">{f.emoji}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>¿Cómo te sientes? (opcional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe cómo te sientes hoy..."
                style={{ minHeight: 80 }}
              />
            </div>

            <div className="form-group">
              <label>Síntomas presentes</label>
              <div className="tags-row">
                {SYMPTOM_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                      border: `2px solid ${selectedTags.includes(tag) ? '#8A9A5B' : '#D4C9A8'}`,
                      background: selectedTags.includes(tag) ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                      fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font)',
                      color: selectedTags.includes(tag) ? '#6B7A46' : '#6B5D3F'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Grabación de voz</label>
              {!recording && !audioBlob && (
                <button className="btn btn-outline btn-full" onClick={startRecording}>
                  🎙 Iniciar grabación
                </button>
              )}
              {recording && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                  <div className="recording-indicator">
                    <div className="recording-dot" /> Grabando...
                  </div>
                  <button className="btn btn-danger btn-full" onClick={stopRecording}>⏹ Detener</button>
                </div>
              )}
              {audioBlob && !recording && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ color: 'var(--olive-dark)', fontWeight: 700, fontSize: '0.9rem' }}>✅ Audio grabado</p>
                  {transcribing && <p className="text-muted text-sm">Transcribiendo...</p>}
                  {transcript && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                      🎙 "{transcript}"
                    </p>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => { setAudioBlob(null); setTranscript('') }}>
                    🗑 Descartar audio
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Foto (opcional)</label>
              <input
                type="file"
                ref={photoRef}
                accept="image/*"
                capture="environment"
                onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              <button className="btn btn-outline btn-full" onClick={() => photoRef.current?.click()}>
                📷 {photoFile ? `Foto: ${photoFile.name}` : 'Tomar o adjuntar foto'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveEntry} style={{ flex: 2 }}>
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
