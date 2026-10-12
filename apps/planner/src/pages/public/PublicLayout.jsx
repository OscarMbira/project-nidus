import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@nidus/shared/context/ThemeContext'
import { PublicSiteHeader, PublicSiteFooter } from '@nidus/ui/site/PublicSiteChrome.jsx'

/**
 * Frame for the Planner's public pages: the shared Nidus header (company menus + Planner product
 * bar) and footer — v1241 Amendment A, the same header the brand site, Platform and Simulator use.
 */
function ThemeButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PublicSiteHeader currentProduct="planner" themeToggle={<ThemeButton />} LinkComponent={Link} />
      <main className="flex-1">{children}</main>
      <PublicSiteFooter currentProduct="planner" />
    </div>
  )
}

export function AuthCard({ title, children, footer }) {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">{title}</h1>
        {children}
      </div>
      {footer && <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">{footer}</div>}
    </div>
  )
}

export const inputCls = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
export const primaryBtn = 'w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50'
