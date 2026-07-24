/**
 * Simulator Application Header
 * Modern, professional header for Simulator dashboard
 * Uses SystemHeader base component for consistency
 * Does NOT duplicate sidebar navigation items
 */

import { Zap } from 'lucide-react'
import SystemHeader from './SystemHeader'

export default function SimulatorAppHeader({ onSidebarToggle = null }) {
  // Professional navigation links for Simulator
  const simulatorNavLinks = [
    { label: 'Dashboard', path: '/simulator/dashboard' },
    { label: 'Scenarios', path: '/simulator/scenarios' },
    { label: 'My Simulations', path: '/simulator/runs' },
    { label: 'Learning Path', path: '/simulator/learning-path' },
    { label: 'Documentation', path: '/documentation/simulator' },
  ]

  return (
    <SystemHeader
      systemName="Simulator"
      systemIcon={Zap}
      logoBgColor="bg-purple-600"
      headerBgClass="bg-white dark:bg-purple-950"
      textColor="text-gray-900 dark:text-white"
      subtextColor="text-gray-600 dark:text-purple-300"
      hoverBgClass="hover:bg-gray-100 dark:hover:bg-purple-800"
      borderColor="border-gray-200 dark:border-purple-900"
      dashboardPath="/simulator/dashboard"
      settingsPath="/simulator/settings"
      profilePath="/simulator/profile"
      pwaSettingsPath="/simulator/pwa-settings"
      navLinks={simulatorNavLinks}
      onSidebarToggle={onSidebarToggle}
    />
  )
}
