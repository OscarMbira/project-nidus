import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import SimulatorTMSidebar from './SimulatorTMSidebar'

export default function SimulatorTMLayout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <nav className={`fixed top-0 left-0 right-0 z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/simulator/tm/dashboard" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                Team Member Practice
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/simulator/dashboard"
              className={`px-3 py-1.5 text-sm rounded-lg ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Back to Simulator
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16 min-h-screen">
        <SimulatorTMSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
