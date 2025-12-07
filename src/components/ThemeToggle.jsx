import React, { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useThemeContext } from '../context/ThemeContext'

/**
 * Reusable Theme Toggle Button Component
 * Use this component for consistent theme toggle behavior across all pages
 */
export default function ThemeToggle({ className = '', size = 'md' }) {
  let context
  try {
    context = useThemeContext()
  } catch (error) {
    console.error('[ThemeToggle] Theme context not available:', error)
    return (
      <div className="p-2 text-red-500 text-xs" title="Theme context error">
        Error
      </div>
    )
  }

  const { theme, toggleTheme } = context

  // Verify theme matches DOM and fix if needed
  useEffect(() => {
    const root = document.documentElement
    const expectedDark = theme === 'dark'
    const hasDarkClass = root.classList.contains('dark')
    
    if (hasDarkClass !== expectedDark) {
      // Silently fix the mismatch
      if (expectedDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      void root.offsetHeight
    }
  }, [theme])

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const iconSize = sizeClasses[size] || sizeClasses.md

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!toggleTheme) {
      console.error('[ThemeToggle] toggleTheme function is not available')
      return
    }
    
    try {
      toggleTheme()
    } catch (error) {
      console.error('[ThemeToggle] Error calling toggleTheme:', error)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label="Toggle theme"
      type="button"
      data-theme={theme}
      data-testid="theme-toggle-button"
    >
      {theme === 'dark' ? (
        <Sun className={iconSize} data-icon="sun" />
      ) : (
        <Moon className={iconSize} data-icon="moon" />
      )}
    </button>
  )
}

