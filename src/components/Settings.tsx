import { useState, useEffect } from 'react'
import { saveAppState, hashPin, importBackup } from '../storage'
import type { AppState, BloodType, Profile } from '../types'
import { AddProfileModal } from './Onboarding'
import AISettings from './AISettings'

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  async function requestNotifPermission() {
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') showToast('🔔 Notificaciones activadas', 'success')
    else showToast('⚠️ Permiso denegado en el navegador', 'warning')
  }

  async function saveReminderSettings(enabled: boolean, advance: number) {
    const updated: AppState = { ...appState, remindersEnabled: enabled, reminderAdvanceMinutes: advance }
    await saveAppState(updated)
    onStateChange(updated)
    showToast('🔔 Recordatorios actualizados', 'success')
  }

  function sendTestNotif() {
    if (notifPermission !== 'granted') return
    new Notification('💊 Hora de tu medicamento', {
      body: 'Este es un recordatorio de prueba · Vida Sana Mayor',
      icon: `${window.location.origin}/vida-sana-mayor/icons/icon-192.png`,
    })
  }

  const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId) ?? appState.profiles[0]
  const [ecName, setEcName] = useState(activeProfile?.emergencyContactName ?? '')
  const [ecPhone, setEcPhone] = useState(activeProfile?.emergencyContactPhone ?? '')
  const [bloodType, setBloodType] = useState<BloodType | ''>(activeProfile?.bloodType ?? '')

  async function saveEmergencyInfo() {
    if (!activeProfile) return
    const updatedProfile: Profile = {
      ...activeProfile,
      bloodType: bloodType || undefined,
      emergencyContactName:  ecName.trim()  || undefined,
      emergencyContactPhone: ecPhone.trim() || undefined,
    }
    const updated: AppState = {
      ...appState,
      profiles: appState.profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p),
    }
    await saveAppState(updated)
    onStateChange(updated)
    showToast('🆘 Tarjeta de emergencia guardada', 'success')
  }

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

      {/* Tarjeta de emergencia */}
      <div className="card" style={{ borderTop: '3px solid #e74c3c' }}>
        <h3 className="card-title">🆘 Tarjeta de emergencia</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 14 }}>
          Esta información se muestra sin necesidad de PIN para casos de urgencia médica.
        </p>

        <div className="form-group">
          <label>Grupo sanguíneo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BLOOD_TYPES.map(bt => (
              <button
                key={bt}
                onClick={() => setBloodType(prev => prev === bt ? '' : bt)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontWeight: 700,
                  border: bloodType === bt ? '2px solid #e74c3c' : '2px solid var(--border)',
                  background: bloodType === bt ? '#FFECEC' : 'var(--bg)',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.95rem',
                  color: bloodType === bt ? '#c0392b' : 'var(--text)',
                }}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Nombre del contacto de emergencia</label>
          <input
            type="text"
            value={ecName}
            onChange={e => setEcName(e.target.value)}
            placeholder="Ej: María García (hija)"
          />
        </div>

        <div className="form-group">
          <label>Teléfono del contacto</label>
          <input
            type="tel"
            value={ecPhone}
            onChange={e => setEcPhone(e.target.value)}
            placeholder="Ej: +503 7000-0000"
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={saveEmergencyInfo}>
          💾 Guardar tarjeta de emergencia
        </button>
      </div>

      {/* Recordatorios de medicamentos */}
      <div className="card">
        <h3 className="card-title">🔔 Recordatorios de medicamentos</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 14 }}>
          Recibe una notificación a la hora de cada medicamento registrado.
        </p>

        {notifPermission === 'denied' && (
          <div style={{ background: '#FFF3CD', border: '1px solid #F4C430', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: '0.85rem', color: '#856404', fontWeight: 700 }}>
              ⚠️ Notificaciones bloqueadas en el navegador
            </p>
            <p style={{ fontSize: '0.8rem', color: '#856404', marginTop: 4 }}>
              Ve a Configuración del navegador → Privacidad → Notificaciones y permite este sitio.
            </p>
          </div>
        )}

        {notifPermission === 'default' && (
          <button className="btn btn-primary btn-full" onClick={requestNotifPermission} style={{ marginBottom: 12 }}>
            🔔 Permitir notificaciones
          </button>
        )}

        {notifPermission === 'granted' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Recordatorios</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-light)' }}>
                  {appState.remindersEnabled ? '🔔 Activados' : '🔕 Desactivados'}
                </div>
              </div>
              <button
                className={`btn btn-sm ${appState.remindersEnabled ? 'btn-rose' : 'btn-primary'}`}
                onClick={() => saveReminderSettings(!appState.remindersEnabled, appState.reminderAdvanceMinutes ?? 0)}
              >
                {appState.remindersEnabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>

            {appState.remindersEnabled && (
              <>
                <div className="form-group">
                  <label>Avisar con anticipación</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[0, 5, 15, 30].map(min => (
                      <button
                        key={min}
                        onClick={() => saveReminderSettings(true, min)}
                        style={{
                          padding: '8px 14px', borderRadius: 10, fontWeight: 700,
                          border: `2px solid ${(appState.reminderAdvanceMinutes ?? 0) === min ? '#8A9A5B' : 'var(--border)'}`,
                          background: (appState.reminderAdvanceMinutes ?? 0) === min ? 'rgba(138,154,91,0.15)' : 'var(--bg)',
                          color: (appState.reminderAdvanceMinutes ?? 0) === min ? '#6B7A46' : 'var(--text)',
                          cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.9rem',
                        }}
                      >
                        {min === 0 ? 'En punto' : `${min} min antes`}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-outline btn-sm" onClick={sendTestNotif} style={{ marginTop: 4 }}>
                  🧪 Enviar notificación de prueba
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Inteligencia Artificial */}
      <div className="card">
        <h3 className="card-title">🤖 Inteligencia Artificial</h3>
        <AISettings
          appState={appState}
          onSave={async updated => {
            await saveAppState(updated)
            onStateChange(updated)
          }}
          showToast={showToast}
        />
      </div>

      {/* Autoría, Licencia y Donativos */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>☀️</div>
        <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 2 }}>Vida Sana Mayor</h3>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-light)', marginBottom: 12 }}>
          Versión 1.4.0 · 100% offline · Open Source
        </p>

        {/* Autor */}
        <div style={{
          background: 'rgba(138,154,91,0.1)', border: '1.5px solid rgba(138,154,91,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12, textAlign: 'left'
        }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Autor
          </p>
          <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>Douglas Galindo</p>
          <a
            href="https://www.untaldouglas.info/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#0A66C2', fontWeight: 700, fontSize: '0.88rem',
              textDecoration: 'none', padding: '4px 0'
            }}
          >
            <span style={{ fontSize: '1rem' }}>🔗</span>
            @untaldouglas · untaldouglas.info
          </a>
        </div>

        {/* Licencia */}
        <div style={{
          background: 'rgba(0,0,0,0.03)', border: '1.5px solid var(--border)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12, textAlign: 'left'
        }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Licencia de uso
          </p>
          <p style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 4 }}>
            Apache License 2.0
          </p>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-light)', lineHeight: 1.55 }}>
            Esta aplicación es <strong>gratuita y de código abierto</strong>. Puedes usarla,
            copiarla y distribuirla respetando los términos de la licencia Apache 2.0.
            No se permite su venta ni la eliminación de los créditos del autor.
          </p>
        </div>

        {/* Donativos */}
        <div style={{
          background: '#FFF8E1', border: '2px solid #F4C430',
          borderRadius: 10, padding: '12px 16px', marginBottom: 4, textAlign: 'left'
        }}>
          <p style={{ fontSize: '0.78rem', color: '#8B6914', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Apoya el proyecto
          </p>
          <p style={{ fontSize: '0.85rem', color: '#5D4E10', lineHeight: 1.55, marginBottom: 10 }}>
            Vida Sana Mayor es gratuita y siempre lo será. Si te ha sido útil, considera
            hacer una donación voluntaria para apoyar su desarrollo y mantenimiento. ☀️
          </p>
          <a
            href="https://ko-fi.com/untaldouglas"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#FF5E5B', color: 'white', fontWeight: 800, fontSize: '0.92rem',
              padding: '11px 16px', borderRadius: 10, textDecoration: 'none',
              boxShadow: '0 3px 8px rgba(255,94,91,0.35)', transition: 'opacity 0.15s'
            }}
          >
            ☕ Donar en Ko-fi · ko-fi.com/untaldouglas
          </a>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 10 }}>
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
