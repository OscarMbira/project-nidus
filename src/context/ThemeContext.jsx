import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

// Ensure React is available
if (!React) {
  throw new Error('React is not available. Please check your imports and module resolution.')
}

const ThemeContext = createContext(null)

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    console.error('[useThemeContext] ERROR: Context is null. Component is not wrapped in ThemeProvider!')
    throw new Error('useThemeContext must be used within ThemeProvider')
  }
  return context
}

// Alias for backwards compatibility
export const useTheme = useThemeContext

// Get initial theme from localStorage or default to 'dark'
function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  
  const stored = localStorage.getItem('theme')
  
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  
  return 'dark' // Default theme
}

/**
 * Apply theme class to DOM - optimized for performance
 */
function applyThemeToDOM(theme) {
  const html = document.documentElement
  const body = document.body
  
  // Batch DOM operations - only modify what's necessary
  const isDark = theme === 'dark'
  const currentlyDark = html.classList.contains('dark')
  
  // Only update if theme actually changed
  if (isDark !== currentlyDark) {
    if (isDark) {
      html.classList.add('dark')
      body.classList.add('dark')
    } else {
      html.classList.remove('dark')
      body.classList.remove('dark')
    }
  }
  
  // Set data attribute for CSS selectors
  html.setAttribute('data-theme', theme)
  body.setAttribute('data-theme', theme)
  
  // Save to localStorage (non-blocking)
  try {
    localStorage.setItem('theme', theme)
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Defer any verification to next frame to avoid blocking
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      // Light verification only if needed
      if (isDark !== html.classList.contains('dark')) {
        if (isDark) {
          html.classList.add('dark')
          body.classList.add('dark')
        } else {
          html.classList.remove('dark')
          body.classList.remove('dark')
        }
      }
    })
  }
}

export function ThemeProvider({ children }) {
  const initialTheme = getInitialTheme()
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement
      const body = document.body
      if (initialTheme === 'dark') {
        html.classList.add('dark')
        body.classList.add('dark')
      } else {
        html.classList.remove('dark')
        body.classList.remove('dark')
      }
      html.setAttribute('data-theme', initialTheme)
      body.setAttribute('data-theme', initialTheme)
    }
    return initialTheme
  })

  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  // Apply theme to DOM immediately on click so UI updates without waiting for re-render
  const toggleTheme = useCallback(() => {
    const current = themeRef.current
    const newTheme = current === 'dark' ? 'light' : 'dark'
    applyThemeToDOM(newTheme)
    setTheme(newTheme)
  }, [])

  // Context value
  const contextValue = { theme, toggleTheme }

  // Expose debug utilities globally
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__themeDebug = {
        getTheme: () => theme,
        getLocalStorage: () => localStorage.getItem('theme'),
        getDOMClass: () => {
          const html = document.documentElement
          return html.classList.contains('dark') ? 'dark' : 'light'
        },
        forceTheme: (newTheme) => {
          if (newTheme === 'dark' || newTheme === 'light') {
            setTheme(newTheme)
          }
        },
        toggleThemeInternal: toggleTheme
      }
    }
  }, [theme, toggleTheme])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}
