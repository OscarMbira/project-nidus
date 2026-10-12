import { useState } from 'react'
import Sidebar from '../Sidebar'
import PlatformAppHeader from '../headers/PlatformAppHeader'
import QuickCaptureFab from '../../modules/pmis-gaps/components/QuickCaptureFab'
import PMProjectSelector from './PMProjectSelector'
import { BrandingProvider } from '../../lib/BrandingContext'
import { MenuProvider } from '../../lib/useMenu'
import { CurrentProjectProvider } from '../../lib/CurrentProjectContext'
import { RoleScopeGate, RoleScopedShell } from '@nidus/ui'

export default function PMLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Avoid self-redirect loop: blocked users must leave the PM Layout shell.
  // CurrentProjectProvider must wrap MenuProvider so useMenu can read the open project's
  // industry for pack-grouped sidebar sections.
  return (
    <RoleScopeGate requiredScope="pm" blockedRedirectTo="/simulator/dashboard">
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
