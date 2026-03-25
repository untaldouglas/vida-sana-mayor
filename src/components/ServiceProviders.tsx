// ============================================================
// ServiceProviders – Inventario de proveedores de servicios médicos
// Hospitales, clínicas, laboratorios, farmacias, etc.
// ============================================================
import { useState, useEffect, useRef } from 'react'
import {
  getServiceProviders, saveServiceProvider, deleteServiceProvider,
  generateId, saveMedia, deleteMedia, speak
} from '../storage'
import type { ServiceProvider, ProviderCategory, Profile, MediaFile, AIConfig } from '../types'
import { callAI } from '../services/aiService'
import ImagePicker, { ImageThumbs } from './ImagePicker'

interface ServiceProvidersProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
  aiConfig?: AIConfig | null
}

const CATEGORY_META: Record<ProviderCategory, { label: string; icon: string; color: string }> = {
  hospital:            { label: 'Hospital',              icon: '🏥', color: '#E53935' },
  clinica:             { label: 'Clínica privada',        icon: '🏨', color: '#8E24AA' },
  laboratorio:         { label: 'Laboratorio clínico',    icon: '🔬', color: '#1E88E5' },
  farmacia:            { label: 'Farmacia',               icon: '💊', color: '#43A047' },
  consultorio:         { label: 'Consultorio médico',     icon: '👨‍⚕️', color: '#FB8C00' },
  centro_diagnostico:  { label: 'Centro de diagnóstico',  icon: '📊', color: '#00897B' },
  otro:                { label: 'Otro',                   icon: '🏢', color: '#757575' },
}

// ---- Estrellitas ----
function StarRating({ value, onChange, size = '1.6rem' }: {
  value: number
  onChange?: (v: number) => void
  size?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginLeft: 4 }}>{value}/5</span>
      )}
    </div>
  )
}

export default function ServiceProviders({ profile, showToast, aiConfig }: ServiceProvidersProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [filter, setFilter] = useState<ProviderCategory | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ServiceProvider | null>(null)

  useEffect(() => {
    getServiceProviders(profile.id).then(setProviders)
  }, [profile.id])

  async function saveProvider(prov: ServiceProvider) {
    await saveServiceProvider(prov)
    const updated = await getServiceProviders(profile.id)
    setProviders(updated)
    setShowForm(false)
    setEditing(null)
    showToast('🏥 Proveedor guardado', 'success')
    speak('Proveedor de servicio médico guardado.')
  }

  async function removeProvider(id: string) {
    await deleteServiceProvider(id)
    setProviders(prev => prev.filter(p => p.id !== id))
    showToast('🗑 Proveedor eliminado')
  }

  const filtered = filter === 'todos' ? providers : providers.filter(p => p.category === filter)

  const countByCategory = (cat: ProviderCategory) => providers.filter(p => p.category === cat).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>🏥 Mis proveedores</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Añadir
        </button>
      </div>

      {/* Filtros por categoría */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilter('todos')}
          style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 20,
            border: `2px solid ${filter === 'todos' ? 'var(--olive)' : 'var(--border)'}`,
            background: filter === 'todos' ? 'rgba(138,154,91,0.15)' : 'var(--bg-card)',
            cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.82rem',
            fontWeight: 700, color: filter === 'todos' ? 'var(--olive-dark)' : 'var(--text-light)'
          }}
        >
          Todos ({providers.length})
        </button>
        {(['hospital', 'clinica', 'laboratorio', 'farmacia', 'consultorio', 'centro_diagnostico', 'otro'] as ProviderCategory[]).map(cat => {
          const count = countByCategory(cat)
          if (count === 0 && filter !== cat) return null
          const meta = CATEGORY_META[cat]
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 20,
                border: `2px solid ${filter === cat ? meta.color : 'var(--border)'}`,
                background: filter === cat ? `${meta.color}18` : 'var(--bg-card)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.82rem',
                fontWeight: 700, color: filter === cat ? meta.color : 'var(--text-light)'
              }}
            >
              {meta.icon} {meta.label} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏥</div>
          <p className="text-muted">No hay proveedores registrados{filter !== 'todos' ? ' en esta categoría' : ''}</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            Añadir primer proveedor
          </button>
        </div>
      )}

      <ul className="item-list">
        {filtered.map(prov => {
          const meta = CATEGORY_META[prov.category]
          return (
            <li key={prov.id} className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '2rem', marginTop: 2 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{prov.name}</div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: '0.75rem', fontWeight: 700, background: `${meta.color}18`,
                      color: meta.color, border: `1px solid ${meta.color}44`
                    }}>
                      {meta.label}
                    </span>
                    {prov.subcategory && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: 6 }}>{prov.subcategory}</span>
                    )}
                  </div>
                  {prov.address && <div style={{ fontSize: '0.83rem', color: 'var(--text-light)', marginTop: 4 }}>📍 {prov.address}</div>}
                  {prov.phone && <div style={{ fontSize: '0.83rem', color: 'var(--text-light)' }}>📞 {prov.phone}</div>}
                  {prov.website && <div style={{ fontSize: '0.83rem', color: 'var(--olive-dark)' }}>🌐 {prov.website}</div>}
                  {prov.rating && prov.rating > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <StarRating value={prov.rating} size="1rem" />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {prov.phone && (
                    <a href={`tel:${prov.phone}`} className="btn btn-sm"
                      style={{ padding: '6px 10px', minHeight: 36, background: 'rgba(138,154,91,0.15)', border: 'none', borderRadius: 8, textDecoration: 'none', fontSize: '1rem' }}>
                      📞
                    </a>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => { setEditing(prov); setShowForm(true) }} style={{ padding: '6px 10px', minHeight: 36 }}>✏️</button>
                  <button className="btn btn-sm" onClick={() => removeProvider(prov.id)} style={{ padding: '6px 10px', minHeight: 36, background: '#FFECEC', border: 'none', borderRadius: 8 }}>🗑</button>
                </div>
              </div>
              {prov.notes && (
                <p style={{ fontSize: '0.83rem', color: 'var(--text-light)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  📝 {prov.notes}
                </p>
              )}
              {prov.ratingNotes && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: 4 }}>
                  "{prov.ratingNotes}"
                </p>
              )}
              {prov.aiSummary && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(244,196,48,0.1)', borderRadius: 8, borderLeft: '3px solid var(--sun)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: 2 }}>✨ Resumen IA:</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text)' }}>{prov.aiSummary}</div>
                </div>
              )}
              <ImageThumbs fileIds={prov.imageFileIds ?? []} size={52} />
            </li>
          )
        })}
      </ul>

      {showForm && (
        <ProviderForm
          initial={editing}
          profileId={profile.id}
          aiConfig={aiConfig}
          onSave={saveProvider}
          onClose={() => { setShowForm(false); setEditing(null) }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ---- Formulario ----
function ProviderForm({ initial, profileId, aiConfig, onSave, onClose, showToast }: {
  initial: ServiceProvider | null
  profileId: string
  aiConfig?: AIConfig | null
  onSave: (p: ServiceProvider) => void
  onClose: () => void
  showToast: (msg: string, type?: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<ProviderCategory>(initial?.category ?? 'hospital')
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [ratingNotes, setRatingNotes] = useState(initial?.ratingNotes ?? '')
  const [imageFileIds, setImageFileIds] = useState<string[]>(initial?.imageFileIds ?? [])
  const [aiSummary, setAiSummary] = useState(initial?.aiSummary ?? '')
  const [generatingAI, setGeneratingAI] = useState(false)

  // Audio
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioNoteId, setAudioNoteId] = useState<string | undefined>(initial?.audioNoteId)
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

  async function removeAudio() {
    if (audioNoteId) await deleteMedia(audioNoteId)
    setAudioNoteId(undefined)
    setAudioBlob(null)
  }

  async function generateAISummary() {
    if (!aiConfig || !name) return
    setGeneratingAI(true)
    try {
      const meta = CATEGORY_META[category]
      const context = [
        `Proveedor: ${name}`,
        `Tipo: ${meta.label}`,
        subcategory && `Especialidad: ${subcategory}`,
        address && `Dirección: ${address}`,
        notes && `Notas: ${notes}`,
        rating > 0 && `Calificación: ${rating}/5`,
        ratingNotes && `Comentario: ${ratingNotes}`,
      ].filter(Boolean).join('\n')
      const res = await callAI(
        [{ role: 'user', content: `Genera un resumen útil de este proveedor de servicios médicos:\n\n${context}` }],
        aiConfig,
        'Eres un asistente de salud. Resume información de proveedores médicos de forma concisa y útil para el paciente, en español. Destaca los puntos clave de utilidad.'
      )
      setAiSummary(res.content)
    } catch (e) {
      showToast(`⚠️ Error IA: ${(e as Error).message}`, 'error')
    }
    setGeneratingAI(false)
  }

  async function handleSave() {
    if (!name.trim()) return
    let finalAudioId = audioNoteId
    if (audioBlob && !audioNoteId) {
      const buf = await audioBlob.arrayBuffer()
      const mf: MediaFile = {
        id: generateId(), profileId, type: 'audio',
        mimeType: 'audio/webm', name: `nota-proveedor-${Date.now()}.webm`,
        createdAt: new Date().toISOString(), data: buf
      }
      await saveMedia(mf)
      finalAudioId = mf.id
    }
    onSave({
      id: initial?.id ?? generateId(),
      profileId,
      name: name.trim(),
      category,
      subcategory: subcategory.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
      audioNoteId: finalAudioId,
      aiSummary: aiSummary.trim() || undefined,
      imageFileIds: imageFileIds.length > 0 ? imageFileIds : undefined,
      rating: rating > 0 ? rating : undefined,
      ratingNotes: ratingNotes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString()
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🏥 {initial ? 'Editar' : 'Nuevo'} proveedor</h2>

        {/* Nombre */}
        <div className="form-group">
          <label>Nombre del proveedor *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Hospital Ángeles Lomas" autoFocus />
        </div>

        {/* Categoría */}
        <div className="form-group">
          <label>Tipo de proveedor *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(Object.keys(CATEGORY_META) as ProviderCategory[]).map(cat => {
              const meta = CATEGORY_META[cat]
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                    border: `2px solid ${category === cat ? meta.color : 'var(--border)'}`,
                    background: category === cat ? `${meta.color}18` : 'var(--bg-card)',
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.78rem',
                    fontWeight: 700, color: category === cat ? meta.color : 'var(--text-light)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: '1.4rem' }}>{meta.icon}</div>
                  <div style={{ fontSize: '0.72rem', lineHeight: 1.2 }}>{meta.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Subcategoría */}
        <div className="form-group">
          <label>Especialidad / Subespecialidad</label>
          <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Ej: Oncología, Hematología, Radiología intervencionista..." />
        </div>

        {/* Contacto */}
        <div className="form-group">
          <label>📍 Dirección</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, número, colonia, ciudad..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>📞 Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="55 1234 5678" />
          </div>
          <div className="form-group">
            <label>🌐 Sitio web</label>
            <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.ejemplo.com" />
          </div>
        </div>

        {/* Notas */}
        <div className="form-group">
          <label>📝 Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Horarios, referencias, observaciones generales..." style={{ minHeight: 80 }} />
        </div>

        {/* Audio */}
        <div className="form-group">
          <label>🎙️ Nota de voz</label>
          {audioNoteId || audioBlob ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(138,154,91,0.1)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.4rem' }}>🎵</span>
              <span style={{ flex: 1, fontSize: '0.9rem' }}>Nota de voz guardada</span>
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

        {/* IA */}
        <div className="form-group">
          <label>✨ Resumen inteligente</label>
          {aiConfig ? (
            <div>
              <button type="button" className="btn btn-sm btn-outline" onClick={generateAISummary} disabled={generatingAI || !name} style={{ marginBottom: 8 }}>
                {generatingAI ? '⏳ Generando...' : '✨ Generar resumen con IA'}
              </button>
              {aiSummary && (
                <textarea value={aiSummary} onChange={e => setAiSummary(e.target.value)} style={{ minHeight: 80, background: 'rgba(244,196,48,0.08)', borderColor: 'var(--sun)' }} />
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>Configura un proveedor de IA para generar resúmenes automáticos.</p>
          )}
        </div>

        {/* Fotos */}
        <div className="form-group">
          <ImagePicker
            profileId={profileId}
            fileIds={imageFileIds}
            onChange={setImageFileIds}
            label="📷 Fotos (fachada, directorio, documentos)"
            maxImages={5}
          />
        </div>

        {/* Calificación */}
        <div className="form-group">
          <label>⭐ Calificación</label>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <input
              type="text"
              value={ratingNotes}
              onChange={e => setRatingNotes(e.target.value)}
              placeholder="¿Por qué le diste esta calificación?"
              style={{ marginTop: 8 }}
            />
          )}
          {rating === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 4 }}>Toca una estrella para calificar</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()} style={{ flex: 2 }}>
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
