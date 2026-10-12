import { useState } from 'react'
import Sidebar from '../Sidebar'
import PlatformAppHeader from '../headers/PlatformAppHeader'
import QuickCaptureFab from '../../modules/pmis-gaps/components/QuickCaptureFab'
import { BrandingProvider } from '../../lib/BrandingContext'
import { MenuProvider } from '../../lib/useMenu'
import { RoleScopeGate, RoleScopedShell } from '@nidus/ui'

export default function PMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <RoleScopeGate requiredScope="pmo" blockedRedirectTo="/simulator/pmo/dashboard">
      <BrandingProvider>
      <MenuProvider layoutScope="pmo">
        <RoleScopedShell
          header={<PlatformAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />}
          sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          quickCaptureFab={<QuickCaptureFab />}
        >
          {children}
        </RoleScopedShell>
      </MenuProvider>
      </BrandingProvider>
    </RoleScopeGate>
  )
}
