// ============================================================
// TagManager – gestión del catálogo de etiquetas del usuario
// Vista completa accesible desde "Más opciones"
// ============================================================
import { useState, useEffect } from 'react'
import { getTags, saveTag, deleteTag, generateId } from '../storage'
import type { Profile, Tag } from '../types'

const PRESET_COLORS = [
  '#8A9A5B', '#F4C430', '#D4822A', '#4A90A4', '#9B59B6',
  '#E74C3C', '#27AE60', '#2980B9', '#E67E22', '#7F8C8D',
]

interface Props {
  profile: Profile
  showToast: (msg: string, type?: string) => void
}

type EditState = {
  id: string | null  // null = nuevo
  name: string
  category: string
  color: string
}

const EMPTY_EDIT: EditState = { id: null, name: '', category: '', color: PRESET_COLORS[0] }

export default function TagManager({ profile, showToast }: Props) {
  const [tags, setTags]         = useState<Tag[]>([])
  const [loading, setLoading]   = useState(true)
  const [edit, setEdit]         = useState<EditState | null>(null)
  const [filterCat, setFilter]  = useState('')
  const [confirmDel, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadTags()
  }, [profile.id])

  async function loadTags() {
    setLoading(true)
    setTags(await getTags(profile.id))
    setLoading(false)
  }

  async function handleSave() {
    if (!edit || !edit.name.trim()) return
    const tag: Tag = {
      id:        edit.id ?? generateId(),
      profileId: profile.id,
      name:      edit.name.trim(),
      category:  edit.category.trim() || 'General',
      color:     edit.color,
    }
    await saveTag(tag)
    await loadTags()
    setEdit(null)
    showToast(edit.id ? '✏️ Etiqueta actualizada' : '🏷️ Etiqueta creada', 'success')
  }

  async function handleDelete(tagId: string) {
    await deleteTag(tagId)
    await loadTags()
    setConfirm(null)
    showToast('🗑️ Etiqueta eliminada')
  }

  function startEdit(tag: Tag) {
    setEdit({ id: tag.id, name: tag.name, category: tag.category, color: tag.color })
  }

  function startNew() {
    setEdit({ ...EMPTY_EDIT })
  }

  // Grupos por categoría
  const categories = [...new Set(tags.map(t => t.category || 'General'))].sort()
  const filtered = filterCat
    ? tags.filter(t => (t.category || 'General') === filterCat)
    : tags

  const groups = filtered.reduce<Record<string, Tag[]>>((acc, t) => {
    const cat = t.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: 32 }}>Cargando etiquetas...</p>

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ color: 'var(--text-light)', fontSize: '0.92rem', flex: 1 }}>
          Organiza tus registros con etiquetas personalizadas
        </p>
        <button
          onClick={startNew}
          style={{
            background: '#8A9A5B', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
            fontFamily: 'var(--font)', fontSize: '0.95rem', fontWeight: 700,
            minHeight: 'var(--min-touch)'
          }}
        >
          ➕ Nueva etiqueta
        </button>
      </div>

      {/* Filtro por categoría */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setFilter('')}
            style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${!filterCat ? '#8A9A5B' : '#D4C9A8'}`,
              background: !filterCat ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
              fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 700,
              color: !filterCat ? '#8A9A5B' : 'var(--text)', minHeight: 'unset'
            }}
          >
            Todas ({tags.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat} type="button"
              onClick={() => setFilter(cat === filterCat ? '' : cat)}
              style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${filterCat === cat ? '#8A9A5B' : '#D4C9A8'}`,
                background: filterCat === cat ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 700,
                color: filterCat === cat ? '#8A9A5B' : 'var(--text)', minHeight: 'unset'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista vacía */}
      {tags.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏷️</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin etiquetas todavía</p>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: 16 }}>
            Crea etiquetas para organizar tus registros.<br />
            Ejemplo: "especialidad médica: cirugía", "urgente", "crónico"
          </p>
          <button
            onClick={startNew}
            style={{
              background: '#8A9A5B', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: '0.95rem', fontWeight: 700,
              minHeight: 'var(--min-touch)'
            }}
          >
            Crear primera etiqueta
          </button>
        </div>
      )}

      {/* Tags agrupados */}
      {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catTags]) => (
        <div key={cat} className="card" style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-light)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12
          }}>
            {cat}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catTags.map(tag => (
              <div
                key={tag.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: tag.color + '11', border: `1.5px solid ${tag.color}22`
                }}
              >
                {/* Pastilla de color */}
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: tag.color, flexShrink: 0,
                  boxShadow: `0 0 0 2px ${tag.color}44`
                }} />

                {/* Nombre */}
                <span style={{
                  flex: 1, fontWeight: 700, fontSize: '0.95rem',
                  color: 'var(--text)', fontFamily: 'var(--font)'
                }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 16,
                    background: tag.color + '22', border: `1.5px solid ${tag.color}`,
                    color: tag.color, fontSize: '0.85rem', fontWeight: 700
                  }}>
                    {tag.name}
                  </span>
                </span>

                {/* Acciones */}
                <button
                  type="button"
                  onClick={() => startEdit(tag)}
                  style={{
                    background: 'none', border: '1px solid #D4C9A8',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    fontSize: '0.85rem', minHeight: 'unset', color: 'var(--text)'
                  }}
                  title="Editar"
                >✏️</button>
                <button
                  type="button"
                  onClick={() => setConfirm(tag.id)}
                  style={{
                    background: 'none', border: '1px solid #ffcccc',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    fontSize: '0.85rem', minHeight: 'unset', color: '#c0392b'
                  }}
                  title="Eliminar"
                >🗑️</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de edición / creación */}
      {edit !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom)'
        }}>
          <div style={{
            background: '#FDFAF3', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px', width: '100%', maxWidth: 520
          }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>
              {edit.id ? '✏️ Editar etiqueta' : '➕ Nueva etiqueta'}
            </h3>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Nombre *</label>
              <input
                autoFocus
                type="text"
                value={edit.name}
                onChange={e => setEdit({ ...edit, name: e.target.value })}
                placeholder="Ej: cirugía, urgente, crónico..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Categoría</label>
              <input
                type="text"
                value={edit.category}
                onChange={e => setEdit({ ...edit, category: e.target.value })}
                placeholder="Ej: especialidad médica, estado, prioridad..."
              />
              {/* Sugerencias de categorías existentes */}
              {categories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {categories.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setEdit({ ...edit, category: c })}
                      style={{
                        padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
                        border: `1px solid ${edit.category === c ? '#8A9A5B' : '#D4C9A8'}`,
                        background: edit.category === c ? 'rgba(138,154,91,0.15)' : '#F5F0E1',
                        fontFamily: 'var(--font)', fontSize: '0.8rem', fontWeight: 600,
                        color: edit.category === c ? '#8A9A5B' : 'var(--text)', minHeight: 'unset'
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setEdit({ ...edit, color: c })}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: c, border: edit.color === c ? '3px solid #333' : '2px solid #fff',
                      cursor: 'pointer', minHeight: 'unset', padding: 0,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                ))}
              </div>
              {/* Vista previa */}
              <div style={{ marginTop: 10 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: 20,
                  background: edit.color + '22', border: `1.5px solid ${edit.color}`,
                  color: edit.color, fontSize: '0.9rem', fontWeight: 700,
                  fontFamily: 'var(--font)'
                }}>
                  {edit.name || 'Vista previa'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!edit.name.trim()}
                style={{
                  flex: 1, background: '#8A9A5B', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '14px 0', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 700,
                  minHeight: 'var(--min-touch)', opacity: edit.name.trim() ? 1 : 0.5
                }}
              >
                {edit.id ? 'Actualizar' : 'Crear etiqueta'}
              </button>
              <button
                type="button"
                onClick={() => setEdit(null)}
                style={{
                  padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                  border: '1.5px solid #D4C9A8', background: '#F5F0E1',
                  fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 700,
                  color: 'var(--text)', minHeight: 'var(--min-touch)'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {confirmDel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#FDFAF3', borderRadius: 16, padding: '24px 20px',
            maxWidth: 320, width: '100%', textAlign: 'center'
          }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>🗑️</p>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>¿Eliminar etiqueta?</p>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: 20 }}>
              Se quitará de todos los registros donde esté asignada.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleDelete(confirmDel)}
                style={{
                  flex: 1, background: '#E74C3C', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '12px 0', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontSize: '0.95rem', fontWeight: 700,
                  minHeight: 'var(--min-touch)'
                }}
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1, background: '#F5F0E1', color: 'var(--text)',
                  border: '1.5px solid #D4C9A8', borderRadius: 10, padding: '12px 0',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.95rem',
                  fontWeight: 700, minHeight: 'var(--min-touch)'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
