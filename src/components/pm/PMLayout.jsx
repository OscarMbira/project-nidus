import { useState } from 'react'
import PMSidebar from './PMSidebar'
import SystemHeader from '../headers/SystemHeader'

export default function PMLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pmNavLinks = [
    { label: 'Dashboard', path: '/pm/dashboard' },
    { label: 'Delivery', path: '/pm/delivery/work-packages' },
    { label: 'Controls', path: '/pm/controls/risk-register' },
    { label: 'Reports', path: '/pm/reporting/checkpoint-reports' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <SystemHeader
        systemName="Project Manager"
        logoBgColor="bg-blue-600"
        headerBgClass="bg-gray-800 dark:bg-gray-900"
        textColor="text-white"
        subtextColor="text-gray-400"
        hoverBgClass="hover:bg-gray-700"
        borderColor="border-gray-700 dark:border-gray-800"
        dashboardPath="/pm/dashboard"
        settingsPath="/pm/settings"
        profilePath="/pm/profile"
        navLinks={pmNavLinks}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* PM Sidebar */}
      <PMSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="lg:ml-80 pt-14 sm:pt-16 min-h-screen">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
