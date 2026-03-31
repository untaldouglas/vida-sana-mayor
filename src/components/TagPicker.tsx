// ============================================================
// TagPicker – selector/asignador de etiquetas inline
// Uso: dentro de formularios de cualquier entidad
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { generateId } from '../storage'
import type { Tag } from '../types'

// Colores predefinidos para selección rápida
const PRESET_COLORS = [
  '#8A9A5B', '#F4C430', '#D4822A', '#4A90A4', '#9B59B6',
  '#E74C3C', '#27AE60', '#2980B9', '#E67E22', '#7F8C8D',
]

interface TagPickerProps {
  /** Catálogo completo de tags del perfil */
  tags: Tag[]
  /** IDs actualmente seleccionados */
  selectedIds: string[]
  /** Perfil al que pertenecen los tags nuevos */
  profileId: string
  /** Callback cuando cambia la selección */
  onChange: (selectedIds: string[]) => void
  /** Callback cuando el usuario crea un tag nuevo desde el picker */
  onTagCreated: (tag: Tag) => void
}

export default function TagPicker({
  tags, selectedIds, profileId, onChange, onTagCreated
}: TagPickerProps) {
  const [open, setOpen]           = useState(false)
  const [search, setSearch]       = useState('')
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newCategory, setNewCat]  = useState('')
  const [newColor, setNewColor]   = useState(PRESET_COLORS[0])
  const wrapRef                   = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = tags.filter(t => selectedIds.includes(t.id))

  function toggle(tagId: string) {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  function remove(tagId: string) {
    onChange(selectedIds.filter(id => id !== tagId))
  }

  // Grupos por categoría
  const filtered = tags.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )
  const groups = filtered.reduce<Record<string, Tag[]>>((acc, t) => {
    const cat = t.category || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  function handleCreateTag() {
    if (!newName.trim()) return
    const tag: Tag = {
      id: generateId(),
      profileId,
      name: newName.trim(),
      category: newCategory.trim() || 'General',
      color: newColor,
    }
    onTagCreated(tag)
    onChange([...selectedIds, tag.id])
    setNewName('')
    setNewCat('')
    setNewColor(PRESET_COLORS[0])
    setCreating(false)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Pills de tags seleccionados */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: selected.length ? 8 : 0 }}>
        {selected.map(t => (
          <span
            key={t.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: t.color + '22', border: `1.5px solid ${t.color}`,
              borderRadius: 20, padding: '3px 10px 3px 8px',
              fontSize: '0.82rem', fontWeight: 700, color: t.color,
              fontFamily: 'var(--font)'
            }}
          >
            {t.category ? <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>{t.category}:</span> : null}
            {t.name}
            <button
              type="button"
              onClick={() => remove(t.id)}
              style={{
                background: 'none', border: 'none', padding: '0 0 0 2px',
                cursor: 'pointer', color: t.color, fontSize: '0.85rem',
                lineHeight: 1, minHeight: 'unset'
              }}
              aria-label={`Quitar etiqueta ${t.name}`}
            >×</button>
          </span>
        ))}
      </div>

      {/* Botón agregar */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setCreating(false); setSearch('') }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
          border: '1.5px dashed #8A9A5B', background: 'rgba(138,154,91,0.08)',
          color: '#8A9A5B', fontFamily: 'var(--font)', fontSize: '0.85rem',
          fontWeight: 700, minHeight: 'unset'
        }}
      >
        🏷️ Agregar etiqueta
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          marginTop: 6, width: 280, maxHeight: 340, overflowY: 'auto',
          background: '#FDFAF3', border: '1.5px solid #D4C9A8',
          borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          padding: 12
        }}>
          {!creating ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Buscar etiqueta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: 10, padding: '7px 10px', fontSize: '0.9rem' }}
              />

              {filtered.length === 0 && (
                <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 8 }}>
                  Sin etiquetas
                </p>
              )}

              {Object.entries(groups).map(([cat, catTags]) => (
                <div key={cat} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cat}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {catTags.map(t => {
                      const active = selectedIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggle(t.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 16, cursor: 'pointer',
                            border: `1.5px solid ${t.color}`,
                            background: active ? t.color : t.color + '18',
                            color: active ? '#fff' : t.color,
                            fontFamily: 'var(--font)', fontSize: '0.82rem',
                            fontWeight: 700, minHeight: 'unset',
                            transition: 'all 0.1s'
                          }}
                        >
                          {active ? '✓ ' : ''}{t.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <hr style={{ border: 'none', borderTop: '1px solid #E8E0CC', margin: '8px 0' }} />
              <button
                type="button"
                onClick={() => setCreating(true)}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                  border: '1.5px dashed #8A9A5B', background: 'rgba(138,154,91,0.07)',
                  color: '#8A9A5B', fontFamily: 'var(--font)', fontSize: '0.88rem',
                  fontWeight: 700, minHeight: 'unset'
                }}
              >
                ➕ Crear nueva etiqueta
              </button>
            </>
          ) : (
            /* Formulario de creación rápida */
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>Nueva etiqueta</p>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem' }}>Nombre *</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: cirugía"
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  style={{ padding: '7px 10px', fontSize: '0.9rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem' }}>Categoría</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCat(e.target.value)}
                  placeholder="Ej: especialidad médica"
                  style={{ padding: '7px 10px', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setNewColor(c)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: c, border: newColor === c ? '3px solid #333' : '2px solid #fff',
                        cursor: 'pointer', minHeight: 'unset', padding: 0,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newName.trim()}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    background: '#8A9A5B', color: '#fff', border: 'none',
                    fontFamily: 'var(--font)', fontSize: '0.88rem', fontWeight: 700,
                    minHeight: 'unset', opacity: newName.trim() ? 1 : 0.5
                  }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                    background: '#F5F0E1', color: 'var(--text)', border: '1px solid #D4C9A8',
                    fontFamily: 'var(--font)', fontSize: '0.88rem', fontWeight: 700,
                    minHeight: 'unset'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
