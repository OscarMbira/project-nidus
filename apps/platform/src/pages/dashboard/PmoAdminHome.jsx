/**
 * PMO Admin Home (v982 Phase 5 follow-up — Role-Aware Home Pages)
 * Framework-composed replacement for pages/platform-app/Dashboard.jsx's PMO Executive Summary
 * branch. Mounted at the same `/platform/dashboard` route Dashboard.jsx already used for this
 * audience — Dashboard.jsx now renders this component instead of inlining the content itself.
 * Serves both Account Owner and PMO Admin (see widgetRegistry.js's own header for why one
 * composition, not two).
 */
import { Shield } from 'lucide-react'
import DashboardFramework from '../../components/dashboard/DashboardFramework'
import { useDashboardViewerContext } from '../../components/dashboard/useDashboardViewerContext'
import { PMO_ADMIN_HOME_WIDGETS } from '../../components/dashboard/widgetRegistry'

export default function PmoAdminHome() {
  const { context, loading } = useDashboardViewerContext()

  if (loading) return null // Dashboard.jsx's own loading/auth gates already ran before this mounts

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardFramework
          widgets={PMO_ADMIN_HOME_WIDGETS}
          viewerContext={context}
          title="Platform Dashboard"
          subtitle="Organisation-wide oversight and configuration"
          headerExtra={
            context.isPmoAdmin && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-500/30">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">PMO Admin</span>
              </div>
            )
          }
        />
      </div>
    </div>
  )
}
