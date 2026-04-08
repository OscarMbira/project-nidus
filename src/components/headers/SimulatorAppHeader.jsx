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
      headerBgClass="bg-purple-900 dark:bg-purple-950"
      textColor="text-white"
      subtextColor="text-purple-300"
      hoverBgClass="hover:bg-purple-800"
      borderColor="border-purple-800 dark:border-purple-900"
      dashboardPath="/simulator/dashboard"
      settingsPath="/simulator/settings"
      profilePath="/simulator/profile"
      pwaSettingsPath="/simulator/pwa-settings"
      navLinks={simulatorNavLinks}
      onSidebarToggle={onSidebarToggle}
    />
  )
}
