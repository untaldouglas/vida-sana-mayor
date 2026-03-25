// ============================================================
// AIFeatureInfo.tsx – Informa al usuario qué funciones usan IA
// Componente reutilizable: modo 'full' (Settings) y 'banner' (Dashboard)
// ============================================================

interface AIFeatureInfoProps {
  mode?: 'full' | 'banner'
  onConfigureAI?: () => void
}

const AI_FEATURES = [
  {
    icon: '📝',
    section: 'Diario de síntomas',
    features: [
      'Análisis de patrones en tus registros de síntomas',
      'Sugerencias sobre posibles desencadenantes',
      'Resumen automático del historial de síntomas',
    ],
  },
  {
    icon: '📋',
    section: 'Expediente clínico',
    features: [
      'Resumen automático de notas de consulta',
      'Generación de resumen clínico para compartir con médicos',
      'Organización inteligente de información médica',
    ],
  },
  {
    icon: '📷',
    section: 'Escaneo de documentos',
    features: [
      'Interpretación de resultados de laboratorio escaneados',
      'Explicación en lenguaje sencillo de términos médicos',
      'Extracción estructurada de datos de recetas',
    ],
  },
  {
    icon: '💊',
    section: 'Medicamentos',
    features: [
      'Alerta sobre posibles interacciones entre medicamentos',
      'Explicación del propósito de cada medicamento',
      'Sugerencias de horarios de toma personalizados',
    ],
  },
  {
    icon: '🏠',
    section: 'Panel principal',
    features: [
      'Resumen diario personalizado de tu estado de salud',
      'Alertas inteligentes basadas en tu historial',
    ],
  },
]

export default function AIFeatureInfo({ mode = 'full', onConfigureAI }: AIFeatureInfoProps) {
  if (mode === 'banner') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(138,154,91,0.08) 0%, rgba(244,196,48,0.08) 100%)',
        border: '1.5px dashed rgba(138,154,91,0.4)',
        borderRadius: 14, padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 4 }}>
              Inteligencia Artificial disponible
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 10, lineHeight: 1.5 }}>
              Configura tu proveedor de IA para habilitar análisis de síntomas, resúmenes
              de consultas, interpretación de resultados y más.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {AI_FEATURES.map(f => (
                <span key={f.section} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.75rem', padding: '3px 9px', borderRadius: 20,
                  background: 'rgba(138,154,91,0.12)', color: '#4A5E2A', fontWeight: 700
                }}>
                  {f.icon} {f.section}
                </span>
              ))}
            </div>
            {onConfigureAI && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onConfigureAI}
                style={{ fontSize: '0.82rem' }}
              >
                ⚙️ Configurar IA
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // mode === 'full'
  return (
    <div>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', marginBottom: 14, lineHeight: 1.55 }}>
        La IA es <strong>completamente opcional</strong>. Estas son las funciones que se
        habilitan al configurarla — todas usan los recursos de tu propia cuenta de IA:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AI_FEATURES.map(f => (
          <div key={f.section} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{f.section}</span>
            </div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {f.features.map(feat => (
                <li key={feat} style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 3, lineHeight: 1.45 }}>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p style={{
        fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 12,
        padding: '8px 12px', background: 'rgba(244,196,48,0.1)',
        borderRadius: 8, lineHeight: 1.5
      }}>
        ⚠️ Todas estas funciones generan llamadas a la API de tu proveedor. Cada llamada
        tiene un costo según las tarifas del proveedor elegido. Los costos son
        responsabilidad exclusiva del usuario.
      </p>
    </div>
  )
}
