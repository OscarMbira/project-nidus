import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import MobileNavigation from './MobileNavigation'
import Sidebar from './Sidebar'
import PlatformAppHeader from './headers/PlatformAppHeader'
import SimulatorAppHeader from './headers/SimulatorAppHeader'
import HelpButton from './help/HelpButton'
import FeedbackWidget from './feedback/FeedbackWidget'
import AIChatWidget from './ai/AIChatWidget'
import { BrandingProvider } from '../context/BrandingContext'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname.startsWith('/login') ||
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/auth/confirm-email') ||
                     location.pathname.startsWith('/onboarding')

  // Determine which header to show based on route
  const isPlatformApp = location.pathname.startsWith('/platform/')
  const isSimulatorApp = location.pathname.startsWith('/simulator/')

  return (
    <BrandingProvider>
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Header - Full width, spans from left edge */}
      <div className="w-full">
        {/* Context-Aware Header - NO duplicate menu items */}
        {!isAuthPage && isPlatformApp && (
          <PlatformAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}
        {!isAuthPage && isSimulatorApp && (
          <SimulatorAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}

        {/* Fallback Header for other pages */}
        {!isAuthPage && !isPlatformApp && !isSimulatorApp && (
          <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-4">
                  {/* Sidebar Toggle - Mobile only */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white">
                    Project Nidus
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <MobileNavigation />
                </div>
              </div>
            </div>
          </header>
        )}
      </div>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Only show on authenticated pages, positioned below header */}
        {!isAuthPage && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Main Content - Adjust margin for sidebar on desktop */}
        <main
          id="main-content"
          tabIndex="-1"
          className={`flex-1 pb-16 md:pb-0 ${!isAuthPage ? 'lg:ml-80' : ''} w-full overflow-y-auto overflow-x-hidden h-full`}
        >
          <div className="w-full max-w-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      <HelpButton />
      <FeedbackWidget />
      {!isAuthPage && <AIChatWidget />}
    </div>
    </BrandingProvider>
  )
}

export default Layout
