import { useState } from 'react'
import { speak, generateId, saveAppState } from '../storage'
import type { AppState, Profile } from '../types'

interface OnboardingProps {
  onComplete: (state: AppState) => void
}

const RELATION_SUGGESTIONS = ['esposa', 'esposo', 'hijo', 'hija', 'padre', 'madre', 'hermano', 'hermana', 'amigo', 'amiga', 'cuidador', 'cuidadora']
const AVATARS = ['🧑', '👩', '👨', '👵', '👴', '🧒', '👧', '👦', '🧑‍⚕️', '💛', '💚', '🌻']

type Step = 'name' | 'avatar' | 'pin' | 'done'

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🧑')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [usePIN, setUsePIN] = useState(false)

  function goName() {
    if (!name.trim()) return
    speak(`Hola ${name}. Elige un avatar que te identifique.`)
    setStep('avatar')
  }

  function goPin() {
    speak('¿Quieres proteger la app con un PIN de 4 dígitos?')
    setStep('pin')
  }

  async function finish() {
    if (usePIN) {
      if (pin.length !== 4) { setPinError('El PIN debe tener 4 dígitos'); return }
      if (pin !== pinConfirm) { setPinError('Los PINes no coinciden'); return }
    }
    const profileId = generateId()
    const profile: Profile = {
      id: profileId,
      name: name.trim(),
      relation: 'yo',
      isPrimary: true,
      avatar,
      createdAt: new Date().toISOString()
    }
    const state: AppState = {
      profiles: [profile],
      activeProfileId: profileId,
      onboardingDone: true,
      agreementAccepted: true,
      pinHash: null,
      authMethod: 'none',
      encryptionKey: null
    }
    if (usePIN) {
      const { hashPin } = await import('../storage')
      state.pinHash = await hashPin(pin)
      state.authMethod = 'pin'
    }
    await saveAppState(state)
    speak(`¡Perfecto, ${name}! Tu espacio de salud está listo.`)
    onComplete(state)
  }

  return (
    <div className="onboarding-screen">
      {step === 'name' && (
        <>
          <div className="onboarding-logo">☀️</div>
          <h1 className="onboarding-title">¡Hola! Soy Vida Sana Mayor</h1>
          <p className="onboarding-subtitle">Tu compañera de salud. Vamos a crear tu espacio personal.</p>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div className="form-group">
              <label htmlFor="name">¿Cuál es tu nombre?</label>
              <input
                id="name"
                type="text"
                placeholder="Escribe tu nombre..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goName()}
                autoFocus
                style={{ fontSize: '1.2rem', textAlign: 'center' }}
              />
            </div>
            <button className="btn btn-primary btn-full" onClick={goName} disabled={!name.trim()}>
              Continuar →
            </button>
          </div>
        </>
      )}

      {step === 'avatar' && (
        <>
          <div className="onboarding-logo">{avatar}</div>
          <h1 className="onboarding-title">Elige tu avatar, {name}</h1>
          <p className="onboarding-subtitle">Este ícono te representará en tu perfil.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 300 }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 60, height: 60, fontSize: '1.8rem', borderRadius: 14,
                  border: `3px solid ${a === avatar ? '#8A9A5B' : '#D4C9A8'}`,
                  background: a === avatar ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16, minWidth: 200 }} onClick={goPin}>
            Continuar →
          </button>
        </>
      )}

      {step === 'pin' && (
        <>
          <div className="onboarding-logo">🔒</div>
          <h1 className="onboarding-title">¿Proteger con PIN?</h1>
          <p className="onboarding-subtitle">Opcional. Puedes configurarlo después en ajustes.</p>
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(138,154,91,0.1)', borderRadius: 10 }}>
              <input
                type="checkbox"
                id="usepin"
                checked={usePIN}
                onChange={e => setUsePIN(e.target.checked)}
                style={{ width: 24, height: 24, minHeight: 'unset', accentColor: '#8A9A5B', cursor: 'pointer' }}
              />
              <label htmlFor="usepin" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '1rem' }}>
                Usar PIN de 4 dígitos
              </label>
            </div>

            {usePIN && (
              <>
                <div className="form-group">
                  <label>PIN (4 dígitos)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
                    placeholder="••••"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError('') }}
                    placeholder="••••"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                  />
                </div>
                {pinError && <p style={{ color: '#e74c3c', fontSize: '0.9rem', textAlign: 'center' }}>{pinError}</p>}
              </>
            )}

            <button className="btn btn-primary btn-full" onClick={finish}>
              {avatar} ¡Listo, empecemos!
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---- Modal para añadir perfil adicional ----
interface AddProfileModalProps {
  onAdd: (profile: Profile) => void
  onClose: () => void
}

export function AddProfileModal({ onAdd, onClose }: AddProfileModalProps) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [avatar, setAvatar] = useState('👤')
  const [customRelation, setCustomRelation] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    const rel = relation === '__custom' ? customRelation : relation
    const profile: Profile = {
      id: generateId(),
      name: name.trim(),
      relation: rel || 'familiar',
      isPrimary: false,
      avatar,
      createdAt: new Date().toISOString()
    }
    onAdd(profile)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">👤 Añadir perfil</h2>

        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            placeholder="Nombre de la persona..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Relación</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {RELATION_SUGGESTIONS.map(r => (
              <button
                key={r}
                onClick={() => { setRelation(r); setCustomRelation('') }}
                style={{
                  padding: '8px 14px', borderRadius: 20,
                  border: `2px solid ${relation === r ? '#8A9A5B' : '#D4C9A8'}`,
                  background: relation === r ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                  color: relation === r ? '#6B7A46' : '#6B5D3F',
                  cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                  fontFamily: 'var(--font)'
                }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => setRelation('__custom')}
              style={{
                padding: '8px 14px', borderRadius: 20,
                border: `2px solid ${relation === '__custom' ? '#8A9A5B' : '#D4C9A8'}`,
                background: relation === '__custom' ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                fontFamily: 'var(--font)', color: '#6B5D3F'
              }}
            >
              otra...
            </button>
          </div>
          {relation === '__custom' && (
            <input
              type="text"
              placeholder="Escribe la relación..."
              value={customRelation}
              onChange={e => setCustomRelation(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label>Avatar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 50, height: 50, fontSize: '1.5rem', borderRadius: 10,
                  border: `2px solid ${a === avatar ? '#8A9A5B' : '#D4C9A8'}`,
                  background: a === avatar ? 'rgba(138,154,91,0.15)' : '#FDFAF3',
                  cursor: 'pointer'
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!name.trim()} style={{ flex: 2 }}>
            Añadir perfil
          </button>
        </div>
      </div>
    </div>
  )
}
