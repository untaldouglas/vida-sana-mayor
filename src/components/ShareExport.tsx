import { useState, useRef } from 'react'
import { createShareToken, exportBackup, loadAppState } from '../storage'
import type { Profile, AppState } from '../types'

interface ShareExportProps {
  profile: Profile
  appState: AppState
  showToast: (msg: string, type?: string) => void
}

export default function ShareExport({ profile, appState, showToast }: ShareExportProps) {
  const [tab, setTab] = useState<'share' | 'backup'>('share')
  const [shareToken, setShareToken] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function generateShare() {
    const sections = ['diagnoses', 'medications', 'allergies', 'vaccines']
    const token = await createShareToken(profile.id, sections)
    const url = `${window.location.origin}/share/${token.token}`
    setShareToken(token.token)
    setShareUrl(url)
    generateQR(url)
  }

  async function generateQR(url: string) {
    try {
      const QRCode = (await import('qrcode')).default
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 220,
          color: { dark: '#3D3520', light: '#FDFAF3' }
        })
      }
    } catch {
      // QR fallback
    }
  }

  async function downloadBackup() {
    if (!pin) { showToast('⚠️ Ingresa un PIN para cifrar el respaldo', 'warning'); return }
    if (pin !== pinConfirm) { showToast('⚠️ Los PINes no coinciden', 'warning'); return }
    if (pin.length < 4) { showToast('⚠️ El PIN debe tener al menos 4 caracteres', 'warning'); return }
    setGenerating(true)
    try {
      const state = await loadAppState()
      if (!state) return
      const blob = await exportBackup(state, pin)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vida-sana-mayor-${new Date().toISOString().split('T')[0]}.vsm`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✅ Respaldo descargado', 'success')
      setPin('')
      setPinConfirm('')
    } catch (err) {
      showToast('❌ Error al generar respaldo', 'error')
    }
    setGenerating(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => showToast('📋 Enlace copiado', 'success'))
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 16 }}>📤 Compartir y respaldo</h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['share', '🔗 Compartir'], ['backup', '💾 Respaldo']].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `2px solid ${tab === v ? '#8A9A5B' : '#D4C9A8'}`,
              background: tab === v ? 'rgba(138,154,91,0.15)' : '#FDFAF3', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font)', color: tab === v ? '#6B7A46' : '#6B5D3F' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'share' && (
        <div>
          <div className="card">
            <h3 className="card-title">🔗 Compartir expediente temporal</h3>
            <div style={{ background: '#FFF3CD', border: '1px solid #F4C430', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: '#856404', fontSize: '0.9rem' }}>
                ⏱ El enlace expira en 24 horas automáticamente.
              </p>
              <p style={{ color: '#856404', fontSize: '0.85rem', marginTop: 4 }}>
                Solo comparte diagnósticos, medicamentos, alergias y vacunas.
              </p>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: 16 }}>
              Genera un enlace temporal para compartir con tu médico o familiar de confianza.
            </p>

            {!shareToken && (
              <button className="btn btn-primary btn-full" onClick={generateShare}>
                🔗 Generar enlace temporal
              </button>
            )}

            {shareToken && (
              <div>
                <div className="qr-container">
                  <canvas ref={canvasRef} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center' }}>
                    Código QR – escanear para ver el expediente
                  </p>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12, wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  {shareUrl}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" onClick={copyUrl} style={{ flex: 1 }}>📋 Copiar enlace</button>
                  <button className="btn btn-primary" onClick={() => { setShareToken(''); setShareUrl('') }} style={{ flex: 1 }}>🔄 Generar nuevo</button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ background: 'rgba(138,154,91,0.08)', border: '1px solid var(--olive)' }}>
            <h3 className="card-title" style={{ fontSize: '0.95rem' }}>🔒 Tu privacidad está protegida</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['El enlace expira en 24 horas', 'Solo incluye datos que tú eliges', 'Ningún servidor externo almacena tus datos', 'Puedes cancelar el acceso regenerando el enlace'].map(item => (
                <li key={item} style={{ display: 'flex', gap: 10, fontSize: '0.9rem' }}>
                  <span>✅</span><span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div>
          <div className="card">
            <h3 className="card-title">💾 Exportar respaldo cifrado</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: 16 }}>
              Descarga un archivo <strong>.vsm</strong> con todos tus datos cifrados con AES-256.
              Guárdalo en un lugar seguro.
            </p>
            <div style={{ background: '#FFF3CD', border: '1px solid #F4C430', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: '#856404', fontSize: '0.9rem' }}>
                ⚠️ Importante: el PIN que uses para cifrar será necesario para restaurar el respaldo. ¡No lo olvides!
              </p>
            </div>
            <div className="form-group">
              <label>PIN para cifrar (4+ caracteres)</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="PIN de respaldo..."
                style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>
            <div className="form-group">
              <label>Confirmar PIN</label>
              <input
                type="password"
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value)}
                placeholder="Confirmar PIN..."
                style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={downloadBackup}
              disabled={generating}
            >
              {generating ? '⏳ Generando...' : '💾 Descargar respaldo .vsm'}
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">📤 Importar respaldo</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: 16 }}>
              Para restaurar, ve a <strong>Configuración → Importar respaldo</strong>.
            </p>
            <div style={{ background: 'rgba(138,154,91,0.08)', borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                📁 Perfil actual: <strong>{profile.name}</strong><br/>
                🔢 Total perfiles: <strong>{appState.profiles.length}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
