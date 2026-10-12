/**
 * Project Manager Home (v982 Phase 5 — Role-Aware Home Pages)
 * Framework-composed replacement for pages/pm/PMDashboard.jsx's content — same widgets, same
 * data, same empty states, now assembled via DashboardFramework + PROJECT_MANAGER_HOME_WIDGETS
 * instead of one hand-built component. Mounted at the same `pm/dashboard` route (task C — the
 * route stays alive, it now points here instead of the old fixed component).
 */
import { Briefcase } from 'lucide-react'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import PMBoardMemberDashboard from '../pm/PMBoardMemberDashboard'
import DashboardFramework from '../../components/dashboard/DashboardFramework'
import { useDashboardViewerContext } from '../../components/dashboard/useDashboardViewerContext'
import { PROJECT_MANAGER_HOME_WIDGETS } from '../../components/dashboard/widgetRegistry'

export default function ProjectManagerHome() {
  const { currentProjectId, currentProject, loading: projectLoading } = useCurrentProject()
  const { context } = useDashboardViewerContext({ projectId: currentProjectId })

  const isBoardMemberOnly = !!currentProject?.isGovernanceOnly
  if (isBoardMemberOnly) {
    return <PMBoardMemberDashboard />
  }

  const dashboardTitle = currentProject?.roleDisplayName
    ? `${currentProject.roleDisplayName} Dashboard`
    : 'Project Manager Dashboard'
  const subtitle = currentProject
    ? `Project delivery, execution and control — ${currentProject.projectName}`
    : 'Project delivery, execution and control'

  if (!projectLoading && !currentProjectId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Briefcase className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're not a member of any project yet — stats and quick actions will appear here once you are.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardFramework
      widgets={PROJECT_MANAGER_HOME_WIDGETS}
      viewerContext={context}
      title={dashboardTitle}
      subtitle={subtitle}
    />
  )
}
