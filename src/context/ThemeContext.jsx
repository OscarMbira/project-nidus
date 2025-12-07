import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
 * Apply theme class to DOM - ensures it works reliably
 */
function applyThemeToDOM(theme) {
  const html = document.documentElement
  const body = document.body
  
  // Remove any existing theme classes
  html.classList.remove('dark', 'light')
  body.classList.remove('dark', 'light')
  
  // Add the current theme class
  if (theme === 'dark') {
    html.classList.add('dark')
    body.classList.add('dark')
  } else {
    // For light theme, ensure dark is removed
    html.classList.remove('dark')
    body.classList.remove('dark')
  }
  
  // Force repaints to ensure browser processes the change
  void html.offsetHeight
  void body.offsetHeight
  
  // Trigger style recalculation to force Tailwind to update
  const computed = window.getComputedStyle(html)
  void computed.backgroundColor
  
  const bodyComputed = window.getComputedStyle(body)
  void bodyComputed.backgroundColor
  
  // Force recalculation on root element
  const root = document.getElementById('root')
  if (root) {
    const rootComputed = window.getComputedStyle(root)
    void rootComputed.backgroundColor
  }
  
  // Set data attribute for CSS selectors
  html.setAttribute('data-theme', theme)
  body.setAttribute('data-theme', theme)
  
  // Save to localStorage
  localStorage.setItem('theme', theme)
  
  // Verify and fix if needed
  const finalCheck = html.classList.contains('dark')
  const expected = theme === 'dark'
  
  if (finalCheck !== expected) {
    // Force correction
    if (expected) {
      html.classList.add('dark')
      body.classList.add('dark')
    } else {
      html.classList.remove('dark')
      body.classList.remove('dark')
    }
    void html.offsetHeight
  }
  
  // Use requestAnimationFrame to ensure browser processes the change
  // Tailwind v4 needs this to recognize class changes
  requestAnimationFrame(() => {
    // Force style recalculation on key elements
    const bodyStyles = window.getComputedStyle(body)
    void bodyStyles.backgroundColor
    
    const htmlStyles = window.getComputedStyle(html)
    void htmlStyles.backgroundColor
    
    // Force a repaint by temporarily modifying and restoring a style
    const originalDisplay = html.style.display
    html.style.setProperty('display', 'none', 'important')
    void html.offsetHeight
    html.style.display = originalDisplay
    void html.offsetHeight
  })
}

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage immediately
  const [theme, setTheme] = useState(() => {
    const initialTheme = getInitialTheme()
    // Apply immediately on mount
    if (typeof window !== 'undefined') {
      applyThemeToDOM(initialTheme)
    }
    return initialTheme
  })

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(theme)
    
    // Verify it was applied
    const html = document.documentElement
    const expectedDark = theme === 'dark'
    const hasDark = html.classList.contains('dark')
    
    if (hasDark !== expectedDark) {
      console.error('[ThemeContext] Theme not applied correctly, forcing correction...')
      applyThemeToDOM(theme)
    }
  }, [theme])

  // Memoize toggleTheme to prevent unnecessary re-renders
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark'
      return newTheme
    })
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
