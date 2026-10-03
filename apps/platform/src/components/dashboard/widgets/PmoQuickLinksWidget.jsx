/**
 * PMO Quick Links widget (v982 Phase 5 follow-up) — static links into the Organisation zone's own
 * configuration pages (Phase 2/3/6). No data fetch — pure navigation, the second, independently
 * composable widget alongside PmoAdminOverviewWidget's shared-fetch content.
 */
import { Link } from 'react-router-dom'
import { Settings, Layers, ShieldCheck, Package, Users } from 'lucide-react'

const LINKS = [
  { label: 'PMO Configuration', path: '/platform/pmo-admin/configuration', icon: Settings },
  { label: 'Project Classifications', path: '/platform/pmo-admin/project-classifications', icon: Layers },
  { label: 'Authorities', path: '/platform/pmo-admin/authorities', icon: ShieldCheck },
  { label: 'Capability Profile', path: '/platform/pmo-admin/capability-profile', icon: Package },
  { label: 'Manage Roles', path: '/platform/admin/manage-roles', icon: Users },
]

export default function PmoQuickLinksWidget() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration Shortcuts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
