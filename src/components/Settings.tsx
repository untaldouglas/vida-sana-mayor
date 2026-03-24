import { useState } from 'react'
import { saveAppState, hashPin, importBackup } from '../storage'
import type { AppState, Profile } from '../types'
import { AddProfileModal } from './Onboarding'

interface SettingsProps {
  appState: AppState
  onStateChange: (state: AppState) => void
  showToast: (msg: string, type?: string) => void
}

export default function Settings({ appState, onStateChange, showToast }: SettingsProps) {
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [showPinChange, setShowPinChange] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [importPin, setImportPin] = useState('')

  async function addProfile(profile: Profile) {
    const updated: AppState = { ...appState, profiles: [...appState.profiles, profile] }
    await saveAppState(updated)
    onStateChange(updated)
    setShowAddProfile(false)
    showToast('👤 Perfil añadido', 'success')
  }

  async function deleteProfile(profileId: string) {
    if (appState.profiles.length <= 1) { showToast('⚠️ No puedes eliminar el único perfil', 'warning'); return }
    if (!confirm('¿Eliminar este perfil y todos sus datos?')) return
    const { deleteProfile: del } = await import('../storage')
    await del(profileId)
    const updated: AppState = {
      ...appState,
      profiles: appState.profiles.filter(p => p.id !== profileId),
      activeProfileId: appState.profiles.find(p => p.id !== profileId)?.id ?? null
    }
    await saveAppState(updated)
    onStateChange(updated)
    showToast('🗑 Perfil eliminado')
  }

  async function changePin() {
    if (newPin.length < 4) { showToast('⚠️ PIN mínimo 4 dígitos', 'warning'); return }
    if (newPin !== newPinConfirm) { showToast('⚠️ Los PINes no coinciden', 'warning'); return }
    const hash = await hashPin(newPin)
    const updated: AppState = { ...appState, pinHash: hash, authMethod: 'pin' }
    await saveAppState(updated)
    onStateChange(updated)
    setShowPinChange(false)
    setNewPin('')
    setNewPinConfirm('')
    showToast('🔒 PIN actualizado', 'success')
  }

  async function disablePin() {
    const updated: AppState = { ...appState, pinHash: null, authMethod: 'none' }
    await saveAppState(updated)
    onStateChange(updated)
    showToast('🔓 PIN desactivado')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!importPin) { showToast('⚠️ Ingresa el PIN del respaldo', 'warning'); return }
    try {
      const restoredState = await importBackup(file, importPin)
      await saveAppState(restoredState)
      onStateChange(restoredState)
      showToast('✅ Respaldo restaurado correctamente', 'success')
    } catch {
      showToast('❌ Error: PIN incorrecto o archivo dañado', 'error')
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>⚙️ Configuración</h2>

      {/* Perfiles */}
      <div className="card">
        <h3 className="card-title">👤 Perfiles</h3>
        <ul className="item-list" style={{ marginBottom: 12 }}>
          {appState.profiles.map(p => (
            <li key={p.id} className="item-row">
              <span style={{ fontSize: '1.5rem' }}>{p.avatar}</span>
              <div className="item-body">
                <div className="item-title">{p.name} {p.isPrimary ? '(yo)' : `· ${p.relation}`}</div>
              </div>
              {!p.isPrimary && (
                <button onClick={() => deleteProfile(p.id)}
                  style={{ background: '#FFECEC', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🗑
                </button>
              )}
            </li>
          ))}
        </ul>
        <button className="btn btn-outline btn-full" onClick={() => setShowAddProfile(true)}>
          + Añadir perfil
        </button>
      </div>

      {/* Seguridad */}
      <div className="card">
        <h3 className="card-title">🔒 Seguridad</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <div>
              <div style={{ fontWeight: 700 }}>PIN de acceso</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                {appState.authMethod === 'pin' ? '🔒 Activado' : '🔓 Desactivado'}
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setShowPinChange(true)}>
              {appState.authMethod === 'pin' ? 'Cambiar' : 'Activar'}
            </button>
          </div>
          {appState.authMethod === 'pin' && (
            <button className="btn btn-sm btn-rose" onClick={disablePin}>
              🔓 Desactivar PIN
            </button>
          )}
        </div>
      </div>

      {/* Respaldo */}
      <div className="card">
        <h3 className="card-title">💾 Importar respaldo</h3>
        <div className="form-group">
          <label>PIN del respaldo</label>
          <input
            type="password"
            value={importPin}
            onChange={e => setImportPin(e.target.value)}
            placeholder="PIN con el que se cifró..."
            style={{ letterSpacing: '0.3em', textAlign: 'center' }}
          />
        </div>
        <label style={{ display: 'block' }}>
          <input
            type="file"
            accept=".vsm"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <span className="btn btn-outline btn-full" style={{ display: 'flex', cursor: 'pointer' }}>
            📂 Seleccionar archivo .vsm
          </span>
        </label>
      </div>

      {/* Información */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>☀️</div>
        <h3 style={{ fontWeight: 800, marginBottom: 4 }}>Vida Sana Mayor</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Versión 1.0.0</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 4 }}>
          Apache 2.0 · Open Source · 100% offline
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 8 }}>
          Desarrollado con ❤️ para adultos con enfermedades crónicas
        </p>
      </div>

      {showAddProfile && (
        <AddProfileModal
          onAdd={addProfile}
          onClose={() => setShowAddProfile(false)}
        />
      )}

      {showPinChange && (
        <div className="modal-overlay" onClick={() => setShowPinChange(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🔒 {appState.authMethod === 'pin' ? 'Cambiar' : 'Activar'} PIN</h2>
            <div className="form-group">
              <label>Nuevo PIN (4+ dígitos)</label>
              <input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }} />
            </div>
            <div className="form-group">
              <label>Confirmar PIN</label>
              <input type="password" inputMode="numeric" value={newPinConfirm} onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="••••" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowPinChange(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={changePin} style={{ flex: 2 }}>💾 Guardar PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
