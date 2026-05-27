import { useState } from 'react'
import Sidebar from '../Sidebar'
import PlatformAppHeader from '../headers/PlatformAppHeader'
import QuickCaptureFab from '../../modules/pmis-gaps/components/QuickCaptureFab'
import { BrandingProvider } from '../../context/BrandingContext'

export default function PMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BrandingProvider>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <PlatformAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main
            id="main-content"
            tabIndex="-1"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:ml-80 pt-14 sm:pt-16 w-full"
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 sm:pt-2">
              {children}
            </div>
          </main>
        </div>
        <QuickCaptureFab />
      </div>
    </BrandingProvider>
  )
}
