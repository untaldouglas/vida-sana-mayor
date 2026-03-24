import { useState, useEffect } from 'react'
import { speak } from '../storage'
import type { AppState } from '../types'

interface AuthProps {
  appState: AppState
  onUnlock: () => void
}

export default function Auth({ appState, onUnlock }: AuthProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    speak('Ingresa tu PIN para continuar.')
    tryBiometric()
  }, [])

  async function tryBiometric() {
    if (appState.authMethod !== 'biometric') return
    try {
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
        } as PublicKeyCredentialRequestOptions
      })
      if (cred) onUnlock()
    } catch {
      // fallback to PIN
    }
  }

  function pressKey(key: string) {
    if (key === 'del') {
      setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    if (pin.length >= 4) return
    const newPin = pin + key
    setPin(newPin)
    if (newPin.length === 4) verifyPin(newPin)
  }

  async function verifyPin(entered: string) {
    if (!appState.pinHash) { onUnlock(); return }
    const [saltHex, storedHash] = appState.pinHash.split(':')
    const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    // Derivar clave extractable para comparar el hash
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(entered), 'PBKDF2', false, ['deriveKey']
    )
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['encrypt', 'decrypt']
    )
    const exported = await crypto.subtle.exportKey('raw', key)
    const hashBytes = new Uint8Array(exported)
    const computedHash = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    if (computedHash === storedHash) {
      speak('¡Bienvenida de nuevo!')
      onUnlock()
    } else {
      setAttempts(a => a + 1)
      setPin('')
      setError(attempts >= 2 ? '¿Olvidaste tu PIN? Intenta de nuevo.' : 'PIN incorrecto')
      speak('PIN incorrecto, intenta de nuevo.')
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="auth-screen">
      <div style={{ fontSize: '4rem' }}>🔒</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Vida Sana Mayor</h2>
      <p className="text-muted">Ingresa tu PIN para acceder</p>

      <div className="pin-display">
        {[0,1,2,3].map(i => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      {error && <p style={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.9rem' }}>{error}</p>}

      <div className="pin-pad">
        {keys.map((k, i) => (
          k === '' ? <div key={i} /> :
          <button
            key={i}
            className="pin-key"
            onClick={() => pressKey(k)}
            style={{ color: k === 'del' ? '#e74c3c' : undefined }}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>

      {appState.authMethod === 'biometric' && (
        <button className="btn btn-outline mt-16" onClick={tryBiometric}>
          🫆 Usar biometría
        </button>
      )}
    </div>
  )
}
