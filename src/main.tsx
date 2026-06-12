import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './App.css'

// Precargar voces de síntesis de voz
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}

// Exponer capa de storage para tests E2E
// Se hace con import dinámico para no bloquear la carga inicial de la app
import('./storage').then(m => {
  ;(window as unknown as Record<string, unknown>).__vsm_storage = m
}).catch(() => { /* silently fail in environments where storage is unavailable */ })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
