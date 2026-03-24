import { useState, useRef } from 'react'
import { saveMedia, generateId } from '../storage'
import type { Profile, MediaFile } from '../types'

interface ScanProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

export default function Scan({ profile, showToast }: ScanProps) {
  const [scanning, setScanning] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [consultNotes, setConsultNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [tab, setTab] = useState<'scan' | 'record'>('scan')
  const photoRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setScanning(true)
    setOcrText('Analizando imagen...')
    try {
      // Tesseract.js OCR
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa', 1, {
        logger: () => { /* silent */ }
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      setOcrText(text.trim() || 'No se detectó texto en la imagen.')
    } catch {
      setOcrText('No se pudo realizar el OCR. Puedes escribir el texto manualmente.')
    }
    setScanning(false)
  }

  async function saveScanned() {
    if (!photoRef.current?.files?.[0]) return
    const file = photoRef.current.files[0]
    const buf = await file.arrayBuffer()
    const mf: MediaFile = {
      id: generateId(), profileId: profile.id, type: 'scan',
      mimeType: file.type, name: file.name,
      createdAt: new Date().toISOString(), data: buf, ocrText
    }
    await saveMedia(mf)
    showToast('📄 Documento guardado', 'success')
    setPreviewUrl('')
    setOcrText('')
    if (photoRef.current) photoRef.current.value = ''
  }

  async function startConsultRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setMediaRecorder(mr)
      setRecording(true)
    } catch {
      showToast('⚠️ No se pudo acceder al micrófono', 'warning')
    }
  }

  function stopConsultRecording() {
    mediaRecorder?.stop()
    setRecording(false)
    setMediaRecorder(null)
  }

  async function saveConsult() {
    if (!audioBlob) return
    const buf = await audioBlob.arrayBuffer()
    const mf: MediaFile = {
      id: generateId(), profileId: profile.id, type: 'audio',
      mimeType: 'audio/webm', name: `consulta-${new Date().toISOString()}.webm`,
      createdAt: new Date().toISOString(), data: buf, transcript: consultNotes
    }
    await saveMedia(mf)
    showToast('🎙 Consulta guardada', 'success')
    setAudioBlob(null)
    setAudioUrl('')
    setConsultNotes('')
    setSummary('')
  }

  function generateSummary() {
    if (!consultNotes.trim()) { showToast('⚠️ Escribe notas para generar resumen', 'warning'); return }
    const lines = consultNotes.split('\n').filter(l => l.trim())
    const s = `📋 Resumen de consulta:\n\n${lines.map(l => `• ${l}`).join('\n')}\n\nFecha: ${new Date().toLocaleDateString('es-MX')}`
    setSummary(s)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>📷 Escaneo y grabación</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['scan', '📷 Escanear'], ['record', '🎙 Grabar consulta']].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${tab === v ? '#8A9A5B' : '#D4C9A8'}`,
              background: tab === v ? 'rgba(138,154,91,0.15)' : '#FDFAF3', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font)', color: tab === v ? '#6B7A46' : '#6B5D3F' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'scan' && (
        <div className="card">
          <h3 className="card-title">📷 Escanear documento</h3>
          <p className="text-muted text-sm mb-8">Toma una foto de recetas, análisis o estudios para guardarlos.</p>

          <input
            type="file" ref={photoRef} accept="image/*" capture="environment"
            onChange={handlePhoto} style={{ display: 'none' }}
          />
          <button className="btn btn-primary btn-full" onClick={() => photoRef.current?.click()}>
            📷 Tomar foto o seleccionar imagen
          </button>

          {previewUrl && (
            <div style={{ marginTop: 16 }}>
              <img src={previewUrl} alt="Vista previa" style={{ width: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'cover' }} />
            </div>
          )}

          {scanning && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: '2rem', animation: 'sunPulse 1s infinite' }}>🔍</div>
              <p className="text-muted mt-8">Leyendo texto...</p>
            </div>
          )}

          {ocrText && !scanning && (
            <div style={{ marginTop: 16 }}>
              <label>Texto detectado (editable)</label>
              <textarea
                value={ocrText}
                onChange={e => setOcrText(e.target.value)}
                style={{ minHeight: 120, marginTop: 6 }}
              />
              <button className="btn btn-primary btn-full mt-8" onClick={saveScanned}>
                💾 Guardar documento
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'record' && (
        <div className="card">
          <h3 className="card-title">🎙 Grabar consulta médica</h3>
          <p className="text-muted text-sm mb-8">Graba tu consulta para no olvidar ningún detalle.</p>

          {!recording && !audioBlob && (
            <button className="btn btn-primary btn-full" onClick={startConsultRecording}>
              🎙 Iniciar grabación
            </button>
          )}

          {recording && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
              <div className="recording-indicator">
                <div className="recording-dot" /> Grabando consulta...
              </div>
              <button className="btn btn-danger btn-full" onClick={stopConsultRecording}>
                ⏹ Detener grabación
              </button>
            </div>
          )}

          {audioBlob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: 'var(--olive-dark)', fontWeight: 700 }}>✅ Grabación lista</p>
              <audio src={audioUrl} controls style={{ width: '100%' }} />

              <div className="form-group">
                <label>Notas de la consulta</label>
                <textarea
                  value={consultNotes}
                  onChange={e => setConsultNotes(e.target.value)}
                  placeholder="Diagnóstico, indicaciones, medicamentos recetados..."
                  style={{ minHeight: 120 }}
                />
              </div>

              <button className="btn btn-outline btn-full" onClick={generateSummary}>
                📋 Generar resumen
              </button>

              {summary && (
                <div style={{ background: 'rgba(138,154,91,0.1)', borderRadius: 10, padding: 16, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {summary}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={() => { setAudioBlob(null); setAudioUrl(''); setConsultNotes(''); setSummary('') }} style={{ flex: 1 }}>
                  🗑 Descartar
                </button>
                <button className="btn btn-primary" onClick={saveConsult} style={{ flex: 2 }}>
                  💾 Guardar consulta
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
