import { useState } from 'react'
import PMOSidebar from './PMOSidebar'
import PlatformAppHeader from '../headers/PlatformAppHeader'

export default function PMOLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Platform App Header (same as /platform/* routes) */}
      <PlatformAppHeader onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* PMO Sidebar */}
      <PMOSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - scrollable when form/content exceeds viewport */}
      <main id="main-content" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:ml-80 pt-14 sm:pt-16">
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 sm:pt-2">
          {children}
        </div>
      </main>
    </div>
  )
}
