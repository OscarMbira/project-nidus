import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { registerServiceWorker } from './utils/pwaUtils'

// Initialize theme before React renders to prevent flash
(function initTheme() {
  const stored = localStorage.getItem('theme')
  const theme = stored === 'dark' || stored === 'light' 
    ? stored 
    : 'dark' // Default to dark theme
  
  const root = document.documentElement
  // For Tailwind's class-based dark mode, we only need the 'dark' class
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
})()

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
