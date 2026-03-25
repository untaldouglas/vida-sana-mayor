// ============================================================
// aiService.ts – Capa de servicio para proveedores de IA
// Vida Sana Mayor – los costos son responsabilidad del usuario
// ============================================================

import type { AIConfig } from '../types'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  model: string
  usage?: { inputTokens: number; outputTokens: number }
}

/**
 * Realiza una llamada al proveedor de IA configurado por el usuario.
 * Los costos generados son exclusiva responsabilidad de quien provee la clave API.
 */
export async function callAI(
  messages: AIMessage[],
  config: AIConfig,
  systemPrompt?: string
): Promise<AIResponse> {
  switch (config.provider) {
    case 'anthropic': return callAnthropic(messages, config, systemPrompt)
    case 'openai':    return callOpenAI(messages, config, systemPrompt)
    case 'google':    return callGoogle(messages, config, systemPrompt)
    case 'mistral':   return callMistral(messages, config, systemPrompt)
    case 'ollama':    return callOllama(messages, config, systemPrompt)
    default:          throw new Error('Proveedor de IA no reconocido')
  }
}

async function callAnthropic(
  messages: AIMessage[], config: AIConfig, system?: string
): Promise<AIResponse> {
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 1024,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  }
  if (system) body.system = system

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
  }
  const data = await res.json() as {
    content: Array<{ text: string }>
    model: string
    usage: { input_tokens: number; output_tokens: number }
  }
  return {
    content: data.content[0].text,
    model: data.model,
    usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
  }
}

async function callOpenAI(
  messages: AIMessage[], config: AIConfig, system?: string
): Promise<AIResponse> {
  const msgs = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: config.model, messages: msgs })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
  }
  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
    model: string
    usage: { prompt_tokens: number; completion_tokens: number }
  }
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
  }
}

async function callGoogle(
  messages: AIMessage[], config: AIConfig, system?: string
): Promise<AIResponse> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))
  const body: Record<string, unknown> = { contents }
  if (system) body.systemInstruction = { parts: [{ text: system }] }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
  }
  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  return {
    content: data.candidates[0].content.parts[0].text,
    model: config.model
  }
}

async function callOllama(
  messages: AIMessage[], config: AIConfig, system?: string
): Promise<AIResponse> {
  const baseUrl = (config.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '')
  const msgs = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  // Usa el endpoint compatible con OpenAI que incluye Ollama >= 0.1.24
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: msgs, stream: false })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `Ollama no responde (${res.status}). ¿Está en ejecución?`)
  }
  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
    model: string
    usage?: { prompt_tokens: number; completion_tokens: number }
  }
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined
  }
}

async function callMistral(
  messages: AIMessage[], config: AIConfig, system?: string
): Promise<AIResponse> {
  const msgs = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: config.model, messages: msgs })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Error ${res.status}`)
  }
  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>
    model: string
    usage: { prompt_tokens: number; completion_tokens: number }
  }
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
  }
}
