import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import DynamicMenu from './DynamicMenu'
import MobileNavigation from './MobileNavigation'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import HelpButton from './help/HelpButton'
import FeedbackWidget from './feedback/FeedbackWidget'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname.startsWith('/login') || 
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/auth/confirm-email') ||
                     location.pathname.startsWith('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Sidebar - Only show on authenticated pages */}
      {!isAuthPage && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                {/* Sidebar Toggle - Only show on authenticated pages */}
                {!isAuthPage && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
                <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Project Nidus
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                {/* Top menu for desktop - fallback if sidebar is not preferred */}
                <div className="hidden lg:block">
                  <DynamicMenu />
                </div>
                <MobileNavigation />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" tabIndex="-1" className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      <HelpButton />
      <FeedbackWidget />
    </div>
  )
}

export default Layout
