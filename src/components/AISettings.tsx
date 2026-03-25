// ============================================================
// AISettings.tsx – Configuración de IA por el usuario
// Proveedores: Anthropic, OpenAI, Google, Mistral + Ollama (local/gratuito)
// El costo de IA en la nube es responsabilidad exclusiva del usuario.
// ============================================================

import { useState } from 'react'
import type { AppState, AIConfig, AIProvider } from '../types'
import AIFeatureInfo from './AIFeatureInfo'

// --------------- Catálogo de proveedores y modelos ---------------

interface ModelInfo {
  id: string
  name: string
  costLabel: string
  costLevel: 'gratis' | 'muy-bajo' | 'bajo' | 'medio' | 'alto'
  note?: string
}

interface ProviderInfo {
  name: string
  icon: string
  description: string
  isLocal?: boolean          // true = corre en el dispositivo del usuario, sin costo de API
  models: ModelInfo[]
  apiKeyPlaceholder: string
  apiKeyHint: string
  apiKeyRequired: boolean
  defaultBaseUrl?: string
}

export const AI_PROVIDERS: Record<AIProvider, ProviderInfo> = {
  ollama: {
    name: 'Ollama (local, gratuito)',
    icon: '🦙',
    description: 'Corre modelos de código abierto directamente en tu computadora o servidor local. Sin costo de API ni envío de datos a la nube.',
    isLocal: true,
    models: [
      { id: 'qwen2.5:7b',      name: 'Qwen 2.5 7B – Recomendado (excelente español)',  costLabel: 'Gratis',  costLevel: 'gratis', note: 'Mejor para español' },
      { id: 'llama3.2:3b',     name: 'Llama 3.2 3B – Rápido y ligero',                costLabel: 'Gratis',  costLevel: 'gratis', note: 'Muy rápido' },
      { id: 'llama3.1:8b',     name: 'Llama 3.1 8B – Equilibrado',                    costLabel: 'Gratis',  costLevel: 'gratis' },
      { id: 'mistral:7b',      name: 'Mistral 7B – Sólido y versátil',                costLabel: 'Gratis',  costLevel: 'gratis' },
      { id: 'gemma2:9b',       name: 'Gemma 2 9B – Buena comprensión',                costLabel: 'Gratis',  costLevel: 'gratis' },
      { id: 'phi3.5:mini',     name: 'Phi-3.5 Mini – Ultra ligero',                   costLabel: 'Gratis',  costLevel: 'gratis', note: 'Dispositivos lentos' },
      { id: 'deepseek-r1:8b',  name: 'DeepSeek-R1 8B – Bueno para razonamiento',      costLabel: 'Gratis',  costLevel: 'gratis' },
    ],
    apiKeyPlaceholder: '(no requerida)',
    apiKeyHint: 'Ollama no requiere clave API. Solo necesitas tenerlo instalado y corriendo.',
    apiKeyRequired: false,
    defaultBaseUrl: 'http://localhost:11434',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    icon: '🔶',
    description: 'Servicio en la nube de pago. Requiere clave API y genera costos por uso.',
    models: [
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 – Rápido y económico',  costLabel: 'Muy bajo costo', costLevel: 'muy-bajo' },
      { id: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4.6 – Equilibrado',         costLabel: 'Costo medio',    costLevel: 'medio'   },
      { id: 'claude-opus-4-6',           name: 'Claude Opus 4.6 – Más potente',           costLabel: 'Costo alto',     costLevel: 'alto'    },
    ],
    apiKeyPlaceholder: 'sk-ant-api03-...',
    apiKeyHint: 'Consigue tu clave en console.anthropic.com',
    apiKeyRequired: true,
  },
  openai: {
    name: 'OpenAI (GPT)',
    icon: '⬛',
    description: 'Servicio en la nube de pago. Requiere clave API y genera costos por uso.',
    models: [
      { id: 'gpt-4o-mini',   name: 'GPT-4o Mini – Económico',  costLabel: 'Muy bajo costo', costLevel: 'muy-bajo' },
      { id: 'gpt-4o',        name: 'GPT-4o – Potente',          costLabel: 'Costo alto',     costLevel: 'alto'    },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo – Básico',   costLabel: 'Muy bajo costo', costLevel: 'muy-bajo' },
    ],
    apiKeyPlaceholder: 'sk-...',
    apiKeyHint: 'Consigue tu clave en platform.openai.com/api-keys',
    apiKeyRequired: true,
  },
  google: {
    name: 'Google (Gemini)',
    icon: '🔷',
    description: 'Servicio en la nube de pago. Requiere clave API y genera costos por uso.',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash – Rápido', costLabel: 'Bajo costo',     costLevel: 'bajo'    },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash – Ligero', costLabel: 'Muy bajo costo', costLevel: 'muy-bajo' },
      { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro – Potente',  costLabel: 'Costo medio',    costLevel: 'medio'   },
    ],
    apiKeyPlaceholder: 'AIzaSy...',
    apiKeyHint: 'Consigue tu clave en aistudio.google.com/apikey',
    apiKeyRequired: true,
  },
  mistral: {
    name: 'Mistral AI (nube)',
    icon: '🌊',
    description: 'Servicio en la nube de pago. Requiere clave API y genera costos por uso.',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small – Económico', costLabel: 'Bajo costo',  costLevel: 'bajo' },
      { id: 'mistral-large-latest', name: 'Mistral Large – Potente',   costLabel: 'Costo alto',  costLevel: 'alto' },
    ],
    apiKeyPlaceholder: 'clave-API-mistral...',
    apiKeyHint: 'Consigue tu clave en console.mistral.ai/api-keys',
    apiKeyRequired: true,
  },
}

const COST_COLORS: Record<ModelInfo['costLevel'], { bg: string; color: string }> = {
  'gratis':   { bg: '#E3F2FD', color: '#0D47A1' },
  'muy-bajo': { bg: '#E8F5E9', color: '#2E7D32' },
  'bajo':     { bg: '#F1F8E9', color: '#33691E' },
  'medio':    { bg: '#FFF8E1', color: '#F57F17' },
  'alto':     { bg: '#FFEBEE', color: '#C62828' },
}

// --------------- Props ---------------

interface AISettingsProps {
  appState: AppState
  onSave: (updatedState: AppState) => void
  showToast?: (msg: string, type?: string) => void
  onSkip?: () => void
}

type PanelStep = 'status' | 'features' | 'disclaimer' | 'config'

// --------------- Componente principal ---------------

export default function AISettings({ appState, onSave, showToast, onSkip }: AISettingsProps) {
  const existing = appState.aiConfig ?? null
  const [step, setStep]         = useState<PanelStep>('status')
  const [accepted, setAccepted] = useState(false)
  const [provider, setProvider] = useState<AIProvider>(existing?.provider ?? 'ollama')
  const [apiKey, setApiKey]     = useState(existing?.apiKey ?? '')
  const [model, setModel]       = useState(existing?.model ?? '')
  const [baseUrl, setBaseUrl]   = useState(existing?.baseUrl ?? '')
  const [showKey, setShowKey]   = useState(false)
  const [testing, setTesting]   = useState(false)

  const info = AI_PROVIDERS[provider]
  const isOllama = provider === 'ollama'
  const isCloud = !info.isLocal

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    setModel('')
    setApiKey('')
    setBaseUrl(AI_PROVIDERS[p].defaultBaseUrl ?? '')
  }

  async function handleSave() {
    if (info.apiKeyRequired && !apiKey.trim()) {
      showToast?.('⚠️ Ingresa tu clave API', 'warning'); return
    }
    if (!model) {
      showToast?.('⚠️ Selecciona un modelo', 'warning'); return
    }
    const config: AIConfig = {
      provider,
      apiKey: isOllama ? '' : apiKey.trim(),
      model,
      baseUrl: isOllama ? (baseUrl.trim() || 'http://localhost:11434') : undefined,
      acceptedTerms: true,
      acceptedDate: new Date().toISOString(),
    }
    onSave({ ...appState, aiConfig: config })
    setStep('status')
    showToast?.('✅ Configuración de IA guardada', 'success')
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar la configuración de IA?')) return
    onSave({ ...appState, aiConfig: null })
    setApiKey(''); setModel(''); setBaseUrl(''); setAccepted(false)
    setStep('status')
    showToast?.('🗑 Configuración de IA eliminada')
  }

  async function handleTest() {
    const needsKey = info.apiKeyRequired && !apiKey.trim()
    if (needsKey || !model) {
      showToast?.('⚠️ Completa la configuración antes de probar', 'warning'); return
    }
    setTesting(true)
    try {
      const { callAI } = await import('../services/aiService')
      const testCfg: AIConfig = {
        provider, apiKey: isOllama ? '' : apiKey.trim(), model,
        baseUrl: isOllama ? (baseUrl.trim() || 'http://localhost:11434') : undefined,
        acceptedTerms: true, acceptedDate: new Date().toISOString(),
      }
      const res = await callAI([{ role: 'user', content: 'Responde únicamente: OK' }], testCfg)
      if (res.content) showToast?.(`✅ Conexión exitosa con ${info.name}`, 'success')
    } catch (e) {
      showToast?.('❌ ' + (e instanceof Error ? e.message : 'Error de conexión'), 'error')
    } finally {
      setTesting(false)
    }
  }

  // ─── ESTADO ACTUAL ───────────────────────────────────────
  if (step === 'status') {
    return (
      <div>
        {existing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <span style={{ fontSize: '2rem' }}>{AI_PROVIDERS[existing.provider].icon}</span>
              <div>
                <div style={{ fontWeight: 700 }}>IA configurada</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
                  {AI_PROVIDERS[existing.provider].name} · {existing.model}
                </div>
                {existing.baseUrl && (
                  <div style={{ fontSize: '0.78rem', color: '#8A9A5B' }}>{existing.baseUrl}</div>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 2 }}>
                  Aceptado el {new Date(existing.acceptedDate).toLocaleDateString('es-MX')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline" style={{ flex: 1 }}
                onClick={() => {
                  setProvider(existing.provider)
                  setApiKey(existing.apiKey)
                  setModel(existing.model)
                  setBaseUrl(existing.baseUrl ?? AI_PROVIDERS[existing.provider].defaultBaseUrl ?? '')
                  setAccepted(false)
                  setStep(isCloud ? 'disclaimer' : 'config')
                }}>
                ✏️ Cambiar
              </button>
              <button className="btn btn-sm btn-rose" style={{ flex: 1 }} onClick={handleDelete}>
                🗑 Eliminar
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', marginBottom: 10 }}>
              Sin configurar · Las funciones de IA no están disponibles.
            </p>
            <button className="btn btn-outline btn-full" style={{ marginBottom: 8 }}
              onClick={() => setStep('features')}>
              🤖 Ver funciones disponibles con IA
            </button>
            <button className="btn btn-primary btn-full"
              onClick={() => setStep('features')}>
              ⚙️ Configurar Inteligencia Artificial
            </button>
            {onSkip && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onSkip}>
                Omitir por ahora
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  // ─── QUÉ FUNCIONES USA LA IA ─────────────────────────────
  if (step === 'features') {
    return (
      <div>
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12 }}>
          🤖 ¿Qué funciones habilita la IA?
        </h3>
        <AIFeatureInfo mode="full" />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline" style={{ flex: 1 }}
            onClick={() => setStep('status')}>
            ← Atrás
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }}
            onClick={() => setStep('disclaimer')}>
            Configurar IA →
          </button>
        </div>
        {onSkip && (
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onSkip}>
            Omitir – configurar después
          </button>
        )}
      </div>
    )
  }

  // ─── AVISO LEGAL (solo para proveedores en la nube) ──────
  if (step === 'disclaimer') {
    return (
      <div>
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 14, color: '#8B6914' }}>
          ⚠️ Aviso – Servicios de IA en la nube
        </h3>

        {/* Opción gratuita destacada */}
        <div style={{
          background: '#E3F2FD', border: '2px solid #1976D2',
          borderRadius: 10, padding: '12px 14px', marginBottom: 14
        }}>
          <p style={{ fontWeight: 800, color: '#0D47A1', marginBottom: 4, fontSize: '0.9rem' }}>
            🦙 ¿Sabías que puedes usar IA gratis con Ollama?
          </p>
          <p style={{ fontSize: '0.83rem', color: '#1565C0', lineHeight: 1.5, marginBottom: 8 }}>
            Ollama corre modelos de código abierto (Llama, Mistral, Qwen, etc.) directamente
            en tu computadora, <strong>sin costo alguno</strong> y sin enviar datos a la nube.
          </p>
          <button className="btn btn-sm btn-outline" style={{ fontSize: '0.82rem', borderColor: '#1976D2', color: '#1976D2' }}
            onClick={() => { handleProviderChange('ollama'); setStep('config') }}>
            🦙 Usar Ollama (gratis) →
          </button>
        </div>

        <div style={{
          background: '#FFF8E1', border: '2px solid #F4C430',
          borderRadius: 10, padding: '14px', marginBottom: 14, fontSize: '0.88rem', lineHeight: 1.6
        }}>
          <p style={{ fontWeight: 800, marginBottom: 8 }}>SOBRE COSTOS Y RESPONSABILIDAD</p>
          <p style={{ marginBottom: 8 }}>
            Al usar proveedores en la nube (Anthropic, OpenAI, Google o Mistral) con esta app:
          </p>
          <ul style={{ paddingLeft: 18, marginBottom: 8 }}>
            <li>Usted proporciona y gestiona su propia clave API.</li>
            <li>Los <strong>costos son exclusivamente su responsabilidad</strong>.</li>
            <li>El autor de esta app <strong>no tiene responsabilidad alguna</strong> por dichos costos.</li>
            <li>Las tarifas las define cada proveedor y pueden cambiar.</li>
          </ul>
          <p style={{
            background: 'rgba(192,57,43,0.08)', borderRadius: 7, padding: '7px 10px',
            fontWeight: 700, fontSize: '0.83rem', color: '#7B241C'
          }}>
            Vida Sana Mayor es gratuita (Apache 2.0). Los costos de IA en la nube son
            responsabilidad exclusiva del usuario bajo cualquier circunstancia.
          </p>
        </div>

        <div
          onClick={() => setAccepted(v => !v)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
            background: accepted ? 'rgba(138,154,91,0.12)' : 'rgba(0,0,0,0.03)',
            border: `2px solid ${accepted ? '#8A9A5B' : '#D4C9A8'}`,
            borderRadius: 10, marginBottom: 16, cursor: 'pointer'
          }}
        >
          <input type="checkbox" checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            onClick={e => e.stopPropagation()}
            style={{ width: 22, height: 22, minHeight: 'unset', accentColor: '#8A9A5B', cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
          <label style={{ cursor: 'pointer', fontSize: '0.88rem', lineHeight: 1.5, fontWeight: 600 }}>
            Acepto que los costos de IA en la nube son mi <strong>responsabilidad exclusiva</strong> y
            que el autor de esta app <strong>no tiene responsabilidad alguna</strong> por dichos costos.
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }}
            onClick={() => setStep('features')}>← Atrás</button>
          <button className="btn btn-primary" style={{ flex: 2 }}
            disabled={!accepted} onClick={() => setStep('config')}>
            Acepto, continuar →
          </button>
        </div>
        {onSkip && (
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onSkip}>
            Omitir – configurar después
          </button>
        )}
      </div>
    )
  }

  // ─── FORMULARIO DE CONFIGURACIÓN ────────────────────────
  return (
    <div>
      <h3 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 16 }}>
        {info.icon} Configurar {info.name}
      </h3>

      {/* Selector de proveedor */}
      <div className="form-group">
        <label>Proveedor de IA</label>

        {/* Destacar Ollama como opción gratuita */}
        <div style={{
          background: '#E3F2FD', border: '2px solid #1976D2',
          borderRadius: 10, padding: '10px 14px', marginBottom: 8
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0D47A1', marginBottom: 6 }}>
            🆓 OPCIÓN GRATUITA – Sin costo de API
          </p>
          <button
            onClick={() => handleProviderChange('ollama')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 8,
              border: `2px solid ${provider === 'ollama' ? '#1976D2' : 'transparent'}`,
              background: provider === 'ollama' ? 'rgba(25,118,210,0.1)' : 'white',
              cursor: 'pointer', fontFamily: 'var(--font)'
            }}>
            <span style={{ fontSize: '1.3rem' }}>🦙</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Ollama (local)</div>
              <div style={{ fontSize: '0.75rem', color: '#1565C0' }}>Modelos open-source en tu dispositivo · Gratis · Privado</div>
            </div>
            {provider === 'ollama' && <span style={{ color: '#1976D2', fontWeight: 800 }}>✓</span>}
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: 6, marginTop: 8 }}>
          ☁️ Proveedores en la nube (generan costos)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(['anthropic', 'openai', 'google', 'mistral'] as AIProvider[]).map(p => (
            <button key={p}
              onClick={() => {
                if (provider !== p) {
                  handleProviderChange(p)
                  if (accepted === false) setStep('disclaimer')
                } else {
                  handleProviderChange(p)
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, border: `2px solid ${provider === p ? '#8A9A5B' : '#D4C9A8'}`,
                background: provider === p ? 'rgba(138,154,91,0.1)' : '#FDFAF3',
                cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s'
              }}>
              <span style={{ fontSize: '1.2rem' }}>{AI_PROVIDERS[p].icon}</span>
              <span style={{ fontWeight: 700, flex: 1, textAlign: 'left', fontSize: '0.9rem' }}>{AI_PROVIDERS[p].name}</span>
              {provider === p && <span style={{ color: '#8A9A5B', fontWeight: 800 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* URL base (Ollama) */}
      {isOllama && (
        <div className="form-group">
          <label>URL de Ollama</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 6px' }}>
            Por defecto: <code>http://localhost:11434</code>. Cámbiala si Ollama corre en otro equipo.
          </p>
          <input
            type="url"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
          <div style={{
            marginTop: 8, padding: '10px 12px',
            background: 'rgba(25,118,210,0.07)', borderRadius: 8,
            fontSize: '0.8rem', color: '#1565C0', lineHeight: 1.55
          }}>
            <strong>¿Cómo instalar Ollama?</strong><br />
            1. Descarga en <strong>ollama.com</strong><br />
            2. En terminal: <code>ollama pull qwen2.5:7b</code> (o el modelo que elijas)<br />
            3. Ollama queda corriendo automáticamente en localhost:11434
          </div>
        </div>
      )}

      {/* Clave API (solo proveedores en la nube) */}
      {info.apiKeyRequired && (
        <div className="form-group">
          <label>Clave API</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 6px' }}>
            {info.apiKeyHint}
          </p>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={info.apiKeyPlaceholder}
              style={{ paddingRight: 48 }}
              autoComplete="off"
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 4
              }}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8A9A5B', marginTop: 4 }}>
            🔒 Se guarda solo en este dispositivo · Nunca se comparte con el autor
          </p>
        </div>
      )}

      {/* Selector de modelo */}
      <div className="form-group">
        <label>Modelo a utilizar</label>
        {isOllama && (
          <p style={{ fontSize: '0.8rem', color: '#1565C0', margin: '0 0 8px', lineHeight: 1.45 }}>
            El modelo debe estar descargado en Ollama (<code>ollama pull nombre</code>).
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {info.models.map(m => {
            const colors = COST_COLORS[m.costLevel]
            return (
              <button key={m.id}
                onClick={() => setModel(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                  borderRadius: 10,
                  border: `2px solid ${model === m.id ? (isOllama ? '#1976D2' : '#8A9A5B') : '#D4C9A8'}`,
                  background: model === m.id ? (isOllama ? 'rgba(25,118,210,0.08)' : 'rgba(138,154,91,0.1)') : '#FDFAF3',
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s'
                }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.name}</div>
                  {m.note && <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{m.note}</div>}
                </div>
                <span style={{
                  fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                  background: colors.bg, color: colors.color, fontWeight: 700
                }}>{m.costLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button className="btn btn-outline" style={{ flex: 1 }}
          onClick={handleTest}
          disabled={testing || (!isOllama && !apiKey.trim()) || !model}>
          {testing ? '...' : '⚡ Probar'}
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }}
          onClick={handleSave}
          disabled={(!isOllama && !apiKey.trim()) || !model}>
          💾 Guardar
        </button>
      </div>

      <button className="btn btn-outline btn-full"
        onClick={() => setStep(isCloud ? 'disclaimer' : 'features')}>
        ← Regresar
      </button>

      {onSkip && (
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onSkip}>
          Omitir – configurar después
        </button>
      )}
    </div>
  )
}
