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
  // CurrentProjectProvider must wrap MenuProvider so useMenu's usePlatformProjectId() can read the
  // validated open project (industry pack sections depend on it). Nesting it only inside
  // RoleScopedShell left MenuProvider outside the provider and industry packs never scoped.
  return (
    <RoleScopeGate requiredScope="pm" blockedRedirectTo="/platform/dashboard">
      <BrandingProvider>
      <CurrentProjectProvider>
      <MenuProvider layoutScope="pm">
        <RoleScopedShell
          header={
            <PlatformAppHeader
              onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
              projectSelector={<PMProjectSelector compact />}
            />
          }
          sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          aboveContent={<div className="md:hidden"><PMProjectSelector /></div>}
          quickCaptureFab={<QuickCaptureFab />}
        >
          {children}
        </RoleScopedShell>
      </MenuProvider>
      </CurrentProjectProvider>
      </BrandingProvider>
    </RoleScopeGate>
  )
}
