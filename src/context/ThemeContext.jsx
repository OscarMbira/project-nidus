import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') return stored
      // Default to dark theme if no preference is stored
      return 'dark'
    }
    return 'dark'
  })

  // Apply theme to HTML element whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const root = window.document.documentElement
    // For Tailwind's class-based dark mode, we only need the 'dark' class
    // When 'dark' class is present = dark mode
    // When 'dark' class is absent = light mode
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark'
      // Immediately update the DOM for instant feedback
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement
        if (newTheme === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
        localStorage.setItem('theme', newTheme)
      }
      return newTheme
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

