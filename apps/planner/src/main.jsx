import '@nidus/shared/utils/suppressSupabaseWarnings'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dark by default (rule 28); the header toggle switches and remembers it.
;(function initTheme() {
  let stored = null
  try { stored = localStorage.getItem('theme') } catch { /* private mode */ }
  const theme = stored === 'dark' || stored === 'light' ? stored : 'dark'
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
