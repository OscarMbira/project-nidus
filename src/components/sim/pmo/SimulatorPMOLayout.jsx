import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../Sidebar'
import SimulatorAppHeader from '../../headers/SimulatorAppHeader'
import PracticeDashboardSwitcher from '../ui/PracticeDashboardSwitcher'
import { BrandingProvider } from '../../../context/BrandingContext'

export default function SimulatorPMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BrandingProvider>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <SimulatorAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} simulatorScope="pmo" />

          <main
            id="main-content"
            tabIndex="-1"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:ml-80 pt-14 sm:pt-16 w-full"
          >
            <div className="px-4 sm:px-6 pb-2 pt-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
              <Link
                to="/simulator/dashboard"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Back to Simulator
              </Link>
              <PracticeDashboardSwitcher />
            </div>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </BrandingProvider>
  )
}
