import { useState, useEffect, useCallback } from 'react'
import { loadAppState, saveAppState } from './storage'
import type { AppState, AppView, Profile } from './types'

import Agreement from './components/Agreement'
import Onboarding from './components/Onboarding'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Medications from './components/Medications'
import MedicalRecordView from './components/MedicalRecord'
import SymptomDiary from './components/SymptomDiary'
import Agenda from './components/Agenda'
import Doctors from './components/Doctors'
import Progress from './components/Progress'
import Scan from './components/Scan'
import ShareExport from './components/ShareExport'
import Settings from './components/Settings'
import MedicalExams from './components/MedicalExams'
import ServiceProviders from './components/ServiceProviders'
import { AddProfileModal } from './components/Onboarding'

// ---- Toast ----
interface ToastMsg { id: number; text: string; type: string }

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [view, setView] = useState<AppView>('dashboard')
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [showAddProfile, setShowAddProfile] = useState(false)

  useEffect(() => {
    loadAppState().then(state => {
      setAppState(state)
      setLoading(false)
      if (!state || !state.authMethod || state.authMethod === 'none') {
        setAuthenticated(true)
      }
    })
  }, [])

  const showToast = useCallback((text: string, type = 'default') => {
    const id = Date.now()
    setToasts(t => [...t, { id, text, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  async function handleAddProfile(profile: Profile) {
    if (!appState) return
    const updated: AppState = { ...appState, profiles: [...appState.profiles, profile] }
    await saveAppState(updated)
    setAppState(updated)
    setShowAddProfile(false)
    showToast('👤 Perfil añadido', 'success')
  }

  async function switchProfile(profileId: string) {
    if (!appState) return
    const updated: AppState = { ...appState, activeProfileId: profileId }
    await saveAppState(updated)
    setAppState(updated)
    setView('dashboard')
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <div style={{ fontSize: '4rem', animation: 'sunPulse 1.5s ease-in-out infinite' }}>☀️</div>
        <p style={{ color: 'var(--text-light)', fontWeight: 700 }}>Cargando Vida Sana Mayor...</p>
      </div>
    )
  }

  // ---- Acuerdo de uso ----
  if (!appState?.agreementAccepted) {
    return (
      <Agreement onAccept={async () => {
        const newState: AppState = {
          profiles: [], activeProfileId: null,
          onboardingDone: false, agreementAccepted: true,
          pinHash: null, authMethod: 'none', encryptionKey: null,
          aiConfig: null
        }
        await saveAppState(newState)
        setAppState(newState)
      }} />
    )
  }

  // ---- Onboarding ----
  if (!appState.onboardingDone) {
    return <Onboarding onComplete={state => { setAppState(state); setAuthenticated(true) }} />
  }

  // ---- Autenticación ----
  if (!authenticated && appState.authMethod !== 'none') {
    return <Auth appState={appState} onUnlock={() => setAuthenticated(true)} />
  }

  const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId)
    ?? appState.profiles[0]

  if (!activeProfile) {
    return <Onboarding onComplete={state => { setAppState(state); setAuthenticated(true) }} />
  }

  const NAV_ITEMS = [
    { view: 'dashboard' as AppView, icon: '🏠', label: 'Inicio' },
    { view: 'medications' as AppView, icon: '💊', label: 'Medicamentos' },
    { view: 'symptoms' as AppView, icon: '😊', label: 'Síntomas' },
    { view: 'agenda' as AppView, icon: '📅', label: 'Agenda' },
    { view: 'settings' as AppView, icon: '⚙️', label: 'Más' },
  ]

  const VIEW_TITLES: Record<AppView, string> = {
    agreement: 'Acuerdo de uso',
    onboarding: 'Bienvenida',
    auth: 'Acceso',
    dashboard: `${activeProfile.avatar} ${activeProfile.name}`,
    medications: '💊 Medicamentos',
    record: '📋 Expediente',
    symptoms: '😊 Síntomas',
    agenda: '📅 Agenda',
    doctors: '👨‍⚕️ Doctores',
    progress: '📈 Progreso',
    scan: '📷 Escaneo',
    share: '📤 Compartir',
    settings: '⚙️ Configuración',
    backup: '💾 Respaldo',
    exams: '🔬 Exámenes médicos',
    providers: '🏥 Mis proveedores',
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1>{VIEW_TITLES[view]}</h1>
          {view === 'dashboard' && (
            <p className="subtitle">{activeProfile.relation === 'yo' ? 'Perfil principal' : activeProfile.relation}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {appState.profiles.length > 1 && (
            <button
              onClick={() => setShowAddProfile(false)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontSize: '1.1rem', color: 'white' }}
              title="Cambiar perfil"
            >
              👥
            </button>
          )}
        </div>
      </header>

      {/* Selector de perfiles (si hay más de 1) */}
      {appState.profiles.length > 1 && (
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '8px 16px' }}>
          <div className="profile-bar">
            {appState.profiles.map(p => (
              <button
                key={p.id}
                className={`profile-chip ${p.id === activeProfile.id ? 'active' : ''}`}
                onClick={() => switchProfile(p.id)}
              >
                <span className="chip-avatar">{p.avatar}</span>
                <span>{p.isPrimary ? `${p.name} (yo)` : p.name}</span>
              </button>
            ))}
            <button
              className="profile-chip"
              onClick={() => setShowAddProfile(true)}
              style={{ border: '2px dashed var(--border)', color: 'var(--text-light)' }}
            >
              <span className="chip-avatar">+</span>
              <span>Añadir</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="main-content">
        {view === 'dashboard' && <Dashboard profile={activeProfile} onNavigate={setView} aiConfig={appState.aiConfig} />}
        {view === 'medications' && <Medications profile={activeProfile} showToast={showToast} />}
        {view === 'record' && <MedicalRecordView profile={activeProfile} showToast={showToast} />}
        {view === 'symptoms' && <SymptomDiary profile={activeProfile} showToast={showToast} />}
        {view === 'agenda' && <Agenda profile={activeProfile} showToast={showToast} />}
        {view === 'doctors' && <Doctors profile={activeProfile} showToast={showToast} />}
        {view === 'progress' && <Progress profile={activeProfile} />}
        {view === 'scan' && <Scan profile={activeProfile} showToast={showToast} />}
        {view === 'share' && <ShareExport profile={activeProfile} appState={appState} showToast={showToast} />}
        {view === 'exams' && <MedicalExams profile={activeProfile} showToast={showToast} aiConfig={appState.aiConfig} />}
        {view === 'providers' && <ServiceProviders profile={activeProfile} showToast={showToast} aiConfig={appState.aiConfig} />}
        {view === 'settings' && (
          <Settings
            appState={appState}
            onStateChange={state => setAppState(state)}
            showToast={showToast}
          />
        )}

        {/* Vista "Más" – menú adicional */}
        {view === 'settings' && (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 className="card-title">Más opciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '📋', label: 'Expediente clínico', v: 'record' as AppView },
                { icon: '🔬', label: 'Exámenes médicos', v: 'exams' as AppView },
                { icon: '🏥', label: 'Proveedores de salud', v: 'providers' as AppView },
                { icon: '👨‍⚕️', label: 'Mis doctores', v: 'doctors' as AppView },
                { icon: '📈', label: 'Mi progreso', v: 'progress' as AppView },
                { icon: '📷', label: 'Escaneo y grabación', v: 'scan' as AppView },
                { icon: '📤', label: 'Compartir y respaldo', v: 'share' as AppView },
              ].map(item => (
                <button
                  key={item.v}
                  onClick={() => setView(item.v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '1rem',
                    fontWeight: 600, color: 'var(--text)', minHeight: 'var(--min-touch)',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-light)' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Barra de navegación inferior */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            className={`nav-btn ${view === item.view || (item.view === 'settings' && ['settings','record','doctors','progress','scan','share','exams','providers'].includes(view)) ? 'active' : ''}`}
            onClick={() => setView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
        ))}
      </div>

      {/* Modal añadir perfil */}
      {showAddProfile && (
        <AddProfileModal
          onAdd={handleAddProfile}
          onClose={() => setShowAddProfile(false)}
        />
      )}
    </div>
  )
}
