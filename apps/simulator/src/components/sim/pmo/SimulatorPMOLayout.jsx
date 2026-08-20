import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../Sidebar'
import SimulatorAppHeader from '../../headers/SimulatorAppHeader'
import PracticeDashboardSwitcher from '../ui/PracticeDashboardSwitcher'
import { BrandingProvider } from '../../../context/BrandingContext'
import { MenuProvider } from '../../../hooks/useMenu'
import { RoleScopeGate, RoleScopedShell } from '@nidus/ui'

export default function SimulatorPMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <RoleScopeGate requiredScope="pmo" blockedRedirectTo="/simulator/pmo/dashboard">
      <BrandingProvider>
      <MenuProvider layoutScope="pmo">
        <RoleScopedShell
          header={<SimulatorAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />}
          sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} simulatorScope="pmo" />}
          contentClassName="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-4"
          aboveContent={
            <div className="px-4 sm:px-6 pb-2 pt-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
              <Link
                to="/simulator/dashboard"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Back to Simulator
              </Link>
              <PracticeDashboardSwitcher />
            </div>
          }
        >
          {children}
        </RoleScopedShell>
      </MenuProvider>
      </BrandingProvider>
    </RoleScopeGate>
  )
}
