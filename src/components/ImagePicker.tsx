// ============================================================
// ImagePicker – componente reutilizable de fotos
// Soporta: cámara, archivo, múltiples imágenes, preview, borrar
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { saveMedia, getMedia, deleteMedia, generateId } from '../storage'
import type { MediaFile } from '../types'

interface ImagePickerProps {
  profileId: string
  fileIds: string[]                         // IDs ya guardados en IndexedDB
  onChange: (ids: string[]) => void         // callback al añadir/quitar
  label?: string
  maxImages?: number
}

export default function ImagePicker({
  profileId, fileIds, onChange, label = 'Imágenes', maxImages = 5
}: ImagePickerProps) {
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // Cargar previews de IDs existentes al montar
  useEffect(() => {
    if (fileIds.length === 0) { setPreviews([]); return }
    Promise.all(fileIds.map(id => getMedia(id))).then(files => {
      const loaded = files
        .filter((f): f is MediaFile => !!f)
        .map(f => ({
          id: f.id,
          url: URL.createObjectURL(new Blob([f.data], { type: f.mimeType })),
          name: f.name
        }))
      setPreviews(loaded)
    })
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url))
    }
  }, []) // solo al montar

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (fileIds.length >= maxImages) return
    setLoading(true)

    const newIds: string[] = []
    const newPreviews: { id: string; url: string; name: string }[] = []

    for (const file of Array.from(files)) {
      if (fileIds.length + newIds.length >= maxImages) break
      const buf = await file.arrayBuffer()
      const mf: MediaFile = {
        id: generateId(),
        profileId,
        type: 'photo',
        mimeType: file.type || 'image/jpeg',
        name: file.name || `foto-${Date.now()}.jpg`,
        createdAt: new Date().toISOString(),
        data: buf
      }
      await saveMedia(mf)
      newIds.push(mf.id)
      newPreviews.push({
        id: mf.id,
        url: URL.createObjectURL(new Blob([buf], { type: mf.mimeType })),
        name: mf.name
      })
    }

    setPreviews(prev => [...prev, ...newPreviews])
    onChange([...fileIds, ...newIds])
    setLoading(false)

    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    if (fileRef.current) fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  async function removeImage(id: string) {
    await deleteMedia(id)
    setPreviews(prev => {
      const found = prev.find(p => p.id === id)
      if (found) URL.revokeObjectURL(found.url)
      return prev.filter(p => p.id !== id)
    })
    onChange(fileIds.filter(fid => fid !== id))
  }

  const canAdd = fileIds.length < maxImages

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8 }}>{label}</label>

      {/* Grid de previews */}
      {previews.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {previews.map(p => (
            <div
              key={p.id}
              style={{ position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}
            >
              <img
                src={p.url}
                alt={p.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <button
                onClick={() => removeImage(p.id)}
                style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(200,0,0,0.85)', border: 'none',
                  color: 'white', fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, lineHeight: 1
                }}
                title="Eliminar imagen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botones de carga */}
      {canAdd && (
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Cámara */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple={false}
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => cameraRef.current?.click()}
            disabled={loading}
            style={{ flex: 1, gap: 6 }}
          >
            📷 Cámara
          </button>

          {/* Archivo */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            style={{ flex: 1, gap: 6 }}
          >
            🗂 Archivo
          </button>
        </div>
      )}

      {loading && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 6 }}>
          ⏳ Guardando imagen...
        </p>
      )}

      {fileIds.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 6 }}>
          {fileIds.length}/{maxImages} imagen{fileIds.length !== 1 ? 's' : ''}
          {!canAdd && ' (máximo alcanzado)'}
        </p>
      )}
    </div>
  )
}

// ---- Viewer de miniaturas (solo lectura, para las listas) ----
interface ImageThumbsProps {
  fileIds: string[]
  size?: number
}

export function ImageThumbs({ fileIds, size = 52 }: ImageThumbsProps) {
  const [urls, setUrls] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (fileIds.length === 0) return
    Promise.all(fileIds.map(id => getMedia(id))).then(files => {
      const loaded = files
        .filter((f): f is MediaFile => !!f)
        .map(f => URL.createObjectURL(new Blob([f.data], { type: f.mimeType })))
      setUrls(loaded)
    })
    return () => { urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [fileIds.join(',')])

  if (urls.length === 0) return null

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Imagen ${i + 1}`}
            onClick={() => setExpanded(url)}
            style={{
              width: size, height: size, objectFit: 'cover',
              borderRadius: 8, border: '2px solid var(--border)',
              cursor: 'pointer', flexShrink: 0
            }}
          />
        ))}
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          onClick={() => setExpanded(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 400, padding: 16, cursor: 'zoom-out'
          }}
        >
          <img
            src={expanded}
            alt="Vista completa"
            style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 12, objectFit: 'contain' }}
          />
          <button
            onClick={() => setExpanded(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', fontSize: '1.5rem', borderRadius: '50%',
              width: 44, height: 44, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>
      )}
    </>
  )
}
