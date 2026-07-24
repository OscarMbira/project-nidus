/**
 * Platform Application Header
 * Modern, professional header for Platform PMO Admin dashboard
 * Uses SystemHeader base component for consistency
 * Does NOT duplicate sidebar navigation items
 */

import SystemHeader from './SystemHeader'

export default function PlatformAppHeader({ onSidebarToggle = null }) {
  // Professional navigation links for Platform
  const platformNavLinks = [
    { label: 'Dashboard', path: '/platform/dashboard' },
    { label: 'Projects', path: '/platform/projects' },
    { label: 'Tasks', path: '/platform/tasks' },
    { label: 'Reports', path: '/platform/reports' },
    { label: 'Documentation', path: '/documentation/platform' },
  ]

  return (
    <SystemHeader
      systemName="Platform"
      logoBgColor="bg-blue-600"
      headerBgClass="bg-white dark:bg-gray-900"
      textColor="text-gray-900 dark:text-white"
      subtextColor="text-gray-600 dark:text-gray-400"
      hoverBgClass="hover:bg-gray-100 dark:hover:bg-gray-700"
      borderColor="border-gray-200 dark:border-gray-800"
      dashboardPath="/platform/dashboard"
      settingsPath="/platform/settings"
      profilePath="/platform/profile"
      pwaSettingsPath="/platform/pwa-settings"
      navLinks={platformNavLinks}
      onSidebarToggle={onSidebarToggle}
    />
  )
}
