import { useState } from 'react'
import Sidebar from '../Sidebar'
import PlatformAppHeader from '../headers/PlatformAppHeader'
import QuickCaptureFab from '../../modules/pmis-gaps/components/QuickCaptureFab'
import PMProjectSelector from './PMProjectSelector'
import { BrandingProvider } from '@nidus/shared/context/BrandingContext'
import { MenuProvider } from '@nidus/shared/hooks/useMenu'
import { CurrentProjectProvider } from '../../context/CurrentProjectContext'
import { RoleScopeGate, RoleScopedShell } from '@nidus/ui'

export default function PMLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // When blocked, send users to a home they can open — not /pm/dashboard (same Layout → blank loop).
  return (
    <RoleScopeGate requiredScope="pm" blockedRedirectTo="/platform/dashboard">
      <BrandingProvider>
      <MenuProvider layoutScope="pm">
        <RoleScopedShell
          header={<PlatformAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />}
          sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          aboveContent={<PMProjectSelector />}
          quickCaptureFab={<QuickCaptureFab />}
          providers={[CurrentProjectProvider]}
        >
          {children}
        </RoleScopedShell>
      </MenuProvider>
      </BrandingProvider>
    </RoleScopeGate>
  )
}
