/**
 * Light/dark toggle for the brand site. Same storage key ('theme') as the product homepages.
 * Dark is the default (CLAUDE.md rule 28); the choice is applied in useEffect only, so server
 * rendering never touches window/localStorage.
 */
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function readTheme() {
  try {
    return localStorage.getItem('theme') || 'dark'
  } catch {
    return 'dark'
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Browser-only value: read after hydration so the prerendered HTML matches the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme())
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', theme === 'dark')
    html.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* storage unavailable — theme still applies for this visit */
    }
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label="Toggle theme"
      className="rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
