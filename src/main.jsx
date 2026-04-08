// IMPORTANT: Import warning suppression FIRST, before any other imports
// This ensures console overrides are in place before Supabase/React Router load
import './utils/suppressSupabaseWarnings'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { debugTheme } from './utils/themeDebugger'

// Clean up old localStorage auth data (we now use sessionStorage for auto-logout)
// This runs once on app startup to migrate users from localStorage to sessionStorage
(function cleanupOldAuthStorage() {
  try {
    const oldAuthKey = 'project-nidus-auth'
    if (localStorage.getItem(oldAuthKey)) {
      console.log('Migrating auth from localStorage to sessionStorage...')
      localStorage.removeItem(oldAuthKey)
      console.log('Old auth data cleared. Users will need to login again.')
    }
  } catch (error) {
    console.error('Error cleaning up old auth storage:', error)
  }
})()
// Defer testTailwindDarkMode - not needed for initial render
if (import.meta.env.DEV) {
  import('./utils/testTailwindDarkMode').catch(() => {})
}

// Initialize theme before React renders to prevent flash
(function initTheme() {
  const stored = localStorage.getItem('theme')
  const theme = stored === 'dark' || stored === 'light' 
    ? stored 
    : 'dark' // Default to dark theme
  
  const html = document.documentElement
  const body = document.body
  
  // Remove any existing theme classes
  html.classList.remove('dark', 'light')
  body.classList.remove('dark', 'light')
  
  // Add the current theme class
  if (theme === 'dark') {
    html.classList.add('dark')
    body.classList.add('dark')
  }
  
  // Set data attribute
  html.setAttribute('data-theme', theme)
})()

// Service worker registration: production builds use vite-plugin-pwa (`injectRegister: 'auto'`).
// In development, unregister any stale SWs and clear caches.
if (import.meta.env.DEV) {
      // In development, unregister any existing service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister()
          })
        })
        
        // Clear all caches in development
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              caches.delete(cacheName)
            })
          })
        }
      }
}

// Make debug utilities available globally (only in dev mode)
if (import.meta.env.DEV) {
  window.__themeDebugUtils = {
    debugTheme,
    checkTheme: () => {
      console.log('Current theme state:')
      console.log('  localStorage:', localStorage.getItem('theme'))
      console.log('  DOM dark class:', document.documentElement.classList.contains('dark'))
      console.log('  DOM classes:', Array.from(document.documentElement.classList))
    },
    enableDebugMode: () => {
      window.__themeDebugMode = true
      console.log('Theme debug mode ENABLED - verbose logging active')
    },
    disableDebugMode: () => {
      window.__themeDebugMode = false
      console.log('Theme debug mode DISABLED - minimal logging')
    }
  }
  
  // Debug mode is off by default - enable with window.__themeDebugUtils.enableDebugMode()
  window.__themeDebugMode = false
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
