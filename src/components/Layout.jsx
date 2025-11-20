import { Outlet, Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import DynamicMenu from './DynamicMenu'
import MobileNavigation from './MobileNavigation'
import HelpButton from './help/HelpButton'
import FeedbackWidget from './feedback/FeedbackWidget'
import { useThemeContext } from '../context/ThemeContext'

const Layout = () => {
  const { theme, toggleTheme } = useThemeContext()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Nidus
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <div className="hidden md:block">
                <DynamicMenu />
              </div>
              <MobileNavigation />
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex="-1" className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <HelpButton />
      <FeedbackWidget />
    </div>
  )
}

export default Layout
