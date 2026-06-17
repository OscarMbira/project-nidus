import './utils/suppressSupabaseWarnings'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SimulatorApp from './SimulatorApp.jsx'

;(function initTheme() {
  const stored = localStorage.getItem('theme')
  const theme = stored === 'dark' || stored === 'light' ? stored : 'dark'
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.body.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimulatorApp />
  </StrictMode>,
)
