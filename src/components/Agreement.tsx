import { useState, useEffect } from 'react'
import { speak } from '../storage'

interface AgreementProps {
  onAccept: () => void
}

export default function Agreement({ onAccept }: AgreementProps) {
  const [acceptedGeneral, setAcceptedGeneral] = useState(false)
  const [acceptedAI, setAcceptedAI] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const canContinue = acceptedGeneral && acceptedAI

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
      const fullText = `
        Acuerdo de Uso, Vida Sana Mayor.
        Uno. Privacidad total. Todos tus datos se guardan únicamente en este dispositivo.
        Dos. Datos seguros con cifrado AES-256.
        Tres. Uso personal. No reemplaza la consulta médica profesional.
        Cuatro. Respaldo. Haz copias de seguridad periódicas.
        Cinco. Compartir. Tú decides qué compartes. Los enlaces expiran en 24 horas.
        Seis. Código abierto. La aplicación es gratuita, Apache 2.0. Nunca tendrá costo.
        Siete. Sin publicidad. No mostramos anuncios. No vendemos datos.
        Ocho. Inteligencia Artificial. Las funciones de inteligencia artificial son completamente opcionales
        y utilizan servicios externos de terceros que cobran por su uso.
        Los costos son exclusivamente responsabilidad del usuario.
        El autor de esta aplicación no tiene responsabilidad alguna por dichos costos.
      `.trim()
      speak(fullText)
      const timer = setTimeout(() => setSpeaking(false), fullText.length * 65)
      return () => clearTimeout(timer)
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-logo">☀️</div>
      <h1 className="onboarding-title">Vida Sana Mayor</h1>
      <p className="onboarding-subtitle">Tu salud, en tus manos. 100% privado.</p>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 4 }}>
        Desarrollado por{' '}
        <a
          href="https://www.untaldouglas.info/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#8A9A5B', fontWeight: 700, textDecoration: 'none' }}
        >
          Douglas Galindo · @untaldouglas
        </a>
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: 16 }}>
        Licencia Apache 2.0 · Código abierto · Sin costo
      </p>

      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* ---- Términos generales ---- */}
        <div className="agreement-text" style={{ fontSize: '0.92rem', marginBottom: 16 }}>

          <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>
            Acuerdo de Uso – Vida Sana Mayor
          </p>

          <p style={{ marginBottom: 8 }}>
            Bienvenida y bienvenido. Antes de comenzar, te pedimos que leas este acuerdo.
          </p>

          {[
            { n: '1', title: 'PRIVACIDAD TOTAL', body: 'Todos tus datos de salud se guardan únicamente en este dispositivo. Nadie más tiene acceso a tu información. Ni nosotros, ni ningún servidor externo.' },
            { n: '2', title: 'DATOS SEGUROS', body: 'Tu información está protegida con cifrado AES-256, el mismo nivel de seguridad que usan los bancos.' },
            { n: '3', title: 'USO PERSONAL', body: 'Esta aplicación es una herramienta de apoyo para el seguimiento de tu salud. No reemplaza la consulta médica profesional.' },
            { n: '4', title: 'RESPALDO', body: 'Te recomendamos hacer copias de seguridad periódicas para proteger tu información.' },
            { n: '5', title: 'COMPARTIR', body: 'Tú decides qué compartes y con quién. Los enlaces de compartir expiran en 24 horas.' },
            { n: '6', title: 'CÓDIGO ABIERTO', body: 'Esta aplicación es gratuita y de código abierto (Apache 2.0). Nunca tendrá costo.' },
            { n: '7', title: 'SIN PUBLICIDAD', body: 'No mostramos anuncios. No vendemos datos. Nunca.' },
          ].map(item => (
            <p key={item.n} style={{ marginBottom: 8 }}>
              <strong>{item.n}. {item.title}.</strong> {item.body}
            </p>
          ))}

          {/* ---- Punto 8 destacado: IA ---- */}
          <div style={{
            background: '#FFF8E1',
            border: '2px solid #F4C430',
            borderRadius: 10,
            padding: '12px 14px',
            marginTop: 12,
            marginBottom: 4
          }}>
            <p style={{ fontWeight: 800, color: '#8B6914', marginBottom: 6, fontSize: '0.93rem' }}>
              8. INTELIGENCIA ARTIFICIAL – AVISO IMPORTANTE
            </p>
            <p style={{ marginBottom: 6, fontSize: '0.88rem', lineHeight: 1.6 }}>
              Las funciones de Inteligencia Artificial (IA) disponibles en esta aplicación son
              <strong> completamente opcionales</strong>. Si decides usarlas, estas se conectan a
              servicios externos de terceros (como Anthropic, OpenAI, Google o Mistral) que
              <strong> cobran por cada uso según sus propias tarifas</strong>, las cuales pueden
              cambiar sin previo aviso.
            </p>
            <p style={{ marginBottom: 6, fontSize: '0.88rem', lineHeight: 1.6 }}>
              Al usar funciones de IA en esta aplicación, usted:
            </p>
            <ul style={{ paddingLeft: 18, marginBottom: 8, fontSize: '0.88rem', lineHeight: 1.7 }}>
              <li>Proporciona y gestiona su propia clave de acceso API.</li>
              <li>Asume la <strong>responsabilidad total y exclusiva</strong> de todos los costos generados.</li>
              <li>Reconoce que el autor de esta aplicación <strong>no tiene responsabilidad alguna</strong> por dichos costos, bajo ninguna circunstancia.</li>
              <li>Acepta que la aplicación solo actúa como intermediaria técnica sin intervención del autor.</li>
            </ul>
            <p style={{
              background: 'rgba(192,57,43,0.09)',
              borderRadius: 7,
              padding: '7px 10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#7B241C',
              lineHeight: 1.5
            }}>
              El uso de la aplicación es gratuito (Apache 2.0). Los costos por uso de IA
              son responsabilidad exclusiva del usuario y no pueden atribuirse al autor bajo
              ninguna circunstancia.
            </p>
          </div>
        </div>

        {/* ---- Leer en voz alta ---- */}
        <button
          className="btn btn-outline btn-full"
          onClick={readAloud}
          style={{ marginBottom: 16 }}
        >
          {speaking ? '⏹ Detener lectura' : '🔊 Leer en voz alta'}
        </button>

        {/* ---- Checkbox 1: términos generales ---- */}
        <div
          onClick={() => setAcceptedGeneral(v => !v)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            marginBottom: 10, padding: '12px 14px',
            background: acceptedGeneral ? 'rgba(138,154,91,0.12)' : 'rgba(0,0,0,0.03)',
            border: `2px solid ${acceptedGeneral ? '#8A9A5B' : '#D4C9A8'}`,
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <input
            type="checkbox"
            id="accept-general"
            checked={acceptedGeneral}
            onChange={e => setAcceptedGeneral(e.target.checked)}
            onClick={e => e.stopPropagation()}
            style={{ width: 24, height: 24, minHeight: 'unset', marginTop: 2, cursor: 'pointer', accentColor: '#8A9A5B', flexShrink: 0 }}
          />
          <label htmlFor="accept-general" style={{ fontSize: '0.92rem', cursor: 'pointer', color: '#3D3520', marginBottom: 0, lineHeight: 1.5, fontWeight: 600 }}>
            He leído y acepto el Acuerdo de Uso (puntos 1 al 7). Entiendo que mis datos son privados, seguros y que la aplicación es gratuita.
          </label>
        </div>

        {/* ---- Checkbox 2: responsabilidad por IA ---- */}
        <div
          onClick={() => setAcceptedAI(v => !v)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            marginBottom: 20, padding: '12px 14px',
            background: acceptedAI ? 'rgba(244,196,48,0.12)' : 'rgba(0,0,0,0.03)',
            border: `2px solid ${acceptedAI ? '#F4C430' : '#D4C9A8'}`,
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <input
            type="checkbox"
            id="accept-ai"
            checked={acceptedAI}
            onChange={e => setAcceptedAI(e.target.checked)}
            onClick={e => e.stopPropagation()}
            style={{ width: 24, height: 24, minHeight: 'unset', marginTop: 2, cursor: 'pointer', accentColor: '#F4C430', flexShrink: 0 }}
          />
          <label htmlFor="accept-ai" style={{ fontSize: '0.92rem', cursor: 'pointer', color: '#3D3520', marginBottom: 0, lineHeight: 1.5, fontWeight: 600 }}>
            He leído y acepto el punto 8. Entiendo que los costos por uso de Inteligencia Artificial son
            <strong> mi responsabilidad exclusiva</strong> y que el autor de esta app
            <strong> no tiene responsabilidad alguna</strong> por dichos costos bajo ninguna circunstancia.
          </label>
        </div>

        {/* ---- Indicador de progreso ---- */}
        {!canContinue && (
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 12 }}>
            {!acceptedGeneral && !acceptedAI
              ? 'Marca ambas casillas para continuar'
              : !acceptedGeneral
              ? 'Falta aceptar el Acuerdo de Uso general'
              : 'Falta aceptar el aviso de Inteligencia Artificial'}
          </p>
        )}

        <button
          className="btn btn-primary btn-full"
          disabled={!canContinue}
          onClick={() => {
            speak('¡Bienvenida! Vamos a comenzar.')
            onAccept()
          }}
          style={{ opacity: canContinue ? 1 : 0.45 }}
        >
          ✅ Acepto todo y continuar
        </button>
      </div>
    </div>
  )
}
