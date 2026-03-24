import { useState, useEffect } from 'react'
import { speak } from '../storage'

interface AgreementProps {
  onAccept: () => void
}

const AGREEMENT_TEXT = `
Acuerdo de Uso – Vida Sana Mayor

Bienvenida y bienvenido. Antes de comenzar, te pedimos que leas este acuerdo.

1. PRIVACIDAD TOTAL. Todos tus datos de salud se guardan únicamente en este dispositivo. Nadie más tiene acceso a tu información. Ni nosotros, ni ningún servidor externo.

2. DATOS SEGUROS. Tu información está protegida con cifrado AES-256, el mismo nivel de seguridad que usan los bancos.

3. USO PERSONAL. Esta aplicación es una herramienta de apoyo para el seguimiento de tu salud. No reemplaza la consulta médica profesional.

4. RESPALDO. Te recomendamos hacer copias de seguridad periódicas para proteger tu información.

5. COMPARTIR. Tú decides qué compartes y con quién. Los enlaces de compartir expiran en 24 horas.

6. CÓDIGO ABIERTO. Esta aplicación es gratuita y de código abierto (Apache 2.0). Nunca tendrá costo.

7. SIN PUBLICIDAD. No mostramos anuncios. No vendemos datos. Nunca.

Al continuar, aceptas estos términos y confirmas que tienes 18 años o más, o que cuentas con la supervisión de un adulto responsable.
`.trim()

export default function Agreement({ onAccept }: AgreementProps) {
  const [read, setRead] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      speak('Bienvenida a Vida Sana Mayor. Por favor lee el acuerdo de uso antes de continuar.')
    }, 600)
    return () => {
      clearTimeout(timer)
      window.speechSynthesis?.cancel()
    }
  }, [])

  function readAloud() {
    if (speaking) {
      window.speechSynthesis?.cancel()
      setSpeaking(false)
    } else {
      setSpeaking(true)
      speak(AGREEMENT_TEXT)
      const timer = setTimeout(() => setSpeaking(false), AGREEMENT_TEXT.length * 65)
      return () => clearTimeout(timer)
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-logo">☀️</div>
      <h1 className="onboarding-title">Vida Sana Mayor</h1>
      <p className="onboarding-subtitle">Tu salud, en tus manos. 100% privado.</p>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div
          className="agreement-text"
          style={{ fontSize: '0.95rem' }}
        >
          {AGREEMENT_TEXT.split('\n').map((line, i) => (
            <p key={i} style={{ marginBottom: line.startsWith('Acuerdo') ? 12 : 8 }}>
              {line || <br />}
            </p>
          ))}
        </div>

        <button
          className="btn btn-outline btn-full mb-8"
          onClick={readAloud}
          style={{ marginBottom: 10 }}
        >
          {speaking ? '⏹ Detener lectura' : '🔊 Leer en voz alta'}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(138,154,91,0.1)', borderRadius: 10 }}>
          <input
            type="checkbox"
            id="accept"
            checked={read}
            onChange={e => setRead(e.target.checked)}
            style={{ width: 24, height: 24, minHeight: 'unset', marginTop: 2, cursor: 'pointer', accentColor: '#8A9A5B' }}
          />
          <label htmlFor="accept" style={{ fontSize: '0.95rem', cursor: 'pointer', color: '#3D3520', marginBottom: 0 }}>
            He leído y acepto el Acuerdo de Uso. Entiendo que mis datos son privados y seguros.
          </label>
        </div>

        <button
          className="btn btn-primary btn-full"
          disabled={!read}
          onClick={() => {
            speak('¡Bienvenida! Vamos a comenzar.')
            onAccept()
          }}
          style={{ opacity: read ? 1 : 0.5 }}
        >
          ✅ Aceptar y continuar
        </button>
      </div>
    </div>
  )
}
