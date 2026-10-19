import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { mainContentSidebarOffsetClass, useSidebarCollapsed } from '@nidus/shared/hooks/useSidebarCollapsed'
import MobileNavigation from './MobileNavigation'
import Sidebar from './Sidebar'
import PlatformAppHeader from './headers/PlatformAppHeader'
import SimulatorAppHeader from './headers/SimulatorAppHeader'
import HelpButton from './help/HelpButton'
import FeedbackWidget from './feedback/FeedbackWidget'
import AskNidusWidget from '@nidus/ui/ai/AskNidusWidget.jsx'
import QuickCaptureFab from '../modules/pmis-gaps/components/QuickCaptureFab'
import { BrandingProvider } from '../lib/BrandingContext'
import { MenuProvider } from '../lib/useMenu'
import PracticeDashboardSwitcher from './sim/ui/PracticeDashboardSwitcher'
import { RoleScopeGate } from '@nidus/ui'

const Layout = ({ children, scope: scopeProp = null }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const location = useLocation()

  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname.startsWith('/login') ||
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/auth/confirm-email') ||
                     location.pathname.startsWith('/onboarding')

  const path = location.pathname
  const scope = scopeProp ?? (path.startsWith('/simulator/pmo') ? 'pmo' : path.startsWith('/simulator/pm') ? 'pm' : null)
  const isScopedPractice = scope === 'pm' || scope === 'pmo'

  // Chromeless render for windows opened via DetachButton (?popout=1) — skip header/sidebar/
  // floating widgets, keep providers so page content still has branding/menu context.
  const isPopout = new URLSearchParams(location.search).get('popout') === '1'
  if (isPopout) {
    return (
      <BrandingProvider>
        <MenuProvider layoutScope={null}>
          <div className="h-screen overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900">
            {children || <Outlet />}
          </div>
        </MenuProvider>
      </BrandingProvider>
    )
  }

  const isPlatformApp =
    path.startsWith('/platform/') ||
    // First-class Platform URLs under /app/* (registered before app/* redirect in App.jsx)
    path.startsWith('/app/project-members') ||
    path.startsWith('/app/project-users') ||
    path.startsWith('/app/local-data-extensions') ||
    path.startsWith('/app/settings/invitation-templates') ||
    path.startsWith('/app/invitation-tracker') ||
    path.startsWith('/platform/invitation-tracker') ||
    path.startsWith('/app/team-appointments') ||
    path.startsWith('/platform/my-appointments') ||
    path.startsWith('/platform/my-team-appointments') ||
    path.startsWith('/platform/pmo-admin/appointments')
  const isSimulatorApp = path.startsWith('/simulator/')

  return (
    <BrandingProvider>
    <MenuProvider layoutScope={scope}>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (window.matchMedia('(min-width: 1024px)').matches) toggleCollapsed()
                      else setSidebarOpen((open) => !open)
                    }}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
                    title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
                  >
                    <Menu className="h-5 w-5 lg:hidden" />
                    {collapsed ? (
                      <PanelLeftOpen className="hidden lg:block h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="hidden lg:block h-5 w-5" />
                    )}
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
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} simulatorScope={isScopedPractice ? scope : null} />
        )}

        {/* Main Content - Adjust margin for sidebar on desktop */}
        <main
          id="main-content"
          tabIndex="-1"
          className={`flex-1 min-w-0 pb-16 md:pb-0 ${!isAuthPage ? mainContentSidebarOffsetClass(collapsed) : ''} transition-[margin] duration-300 ease-in-out overflow-y-auto overflow-x-hidden h-full`}
        >
          {isScopedPractice && (
            <div className="px-4 sm:px-6 pb-2 pt-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
              <Link
                to="/simulator/dashboard"
                className={`text-sm text-gray-600 dark:text-gray-400 ${scope === 'pmo' ? 'hover:text-indigo-600 dark:hover:text-indigo-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
              >
                Back to Simulator
              </Link>
              <PracticeDashboardSwitcher />
            </div>
          )}
          <div className="w-full max-w-full">
            {isScopedPractice ? (
              <RoleScopeGate
                requiredScope={scope}
                blockedRedirectTo={scope === 'pmo' ? '/simulator/pmo/dashboard' : '/simulator/dashboard'}
                fullScreen={false}
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-4">{children || <Outlet />}</div>
              </RoleScopeGate>
            ) : (
              children || <Outlet />
            )}
          </div>
        </main>
      </div>

      <HelpButton />
      <FeedbackWidget />
      {!isAuthPage && <AskNidusWidget workspacePath="/simulator/ai-workspace" settingsPath="/simulator/organisation/ai-settings" />}
      {!isAuthPage && <QuickCaptureFab />}
    </div>
    </MenuProvider>
    </BrandingProvider>
  )
}

export default Layout
