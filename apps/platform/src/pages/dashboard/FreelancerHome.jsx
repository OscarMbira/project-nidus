/**
 * Freelancer / Individual Home (v982 Phase 5 — Role-Aware Home Pages)
 * First persona migrated onto DashboardFramework (decision 1 — smallest, newest audience, least
 * disruption risk while the framework is unproven). Composes FREELANCER_HOME_WIDGETS — a
 * deliberately lighter subset of the same widget pool Project Manager Home uses (proves the
 * framework varies composition per persona, not just reuses everything for everyone).
 *
 * A freelancer/individual account holds `pmo_admin` (v918 registration always grants it — "no one
 * else exists to hold it") but has no portfolio/programme/formal-governance surface worth
 * showing — routed here instead of the PMO Executive Summary by Dashboard.jsx's new
 * `accounts.account_type === 'individual'` branch, not by role name alone.
 *
 * Mounted outside the `/pm/*` route tree, so it brings its own `CurrentProjectProvider` (the
 * widgets it shares with Project Manager Home call `useCurrentProject()`, which needs a provider
 * in the tree — `/pm/*`'s `PMLayout.jsx` supplies one for that tree, this page supplies its own
 * here rather than depending on route nesting).
 */
import { CurrentProjectProvider, useCurrentProject } from '../../context/CurrentProjectContext'
import DashboardFramework from '../../components/dashboard/DashboardFramework'
import { useDashboardViewerContext } from '../../components/dashboard/useDashboardViewerContext'
import { FREELANCER_HOME_WIDGETS } from '../../components/dashboard/widgetRegistry'

function FreelancerHomeContent() {
  const { currentProjectId, currentProject } = useCurrentProject()
  const { context } = useDashboardViewerContext({ projectId: currentProjectId })

  return (
    <DashboardFramework
      widgets={FREELANCER_HOME_WIDGETS}
      viewerContext={context}
      title="Your Workspace"
      subtitle={
        currentProject
          ? `${currentProject.projectName} — everything you need in one place`
          : 'Everything you need in one place'
      }
      emptyState={
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your first project to see your stats, quick actions, and milestones here.
          </p>
        </div>
      }
    />
  )
}

export default function FreelancerHome() {
  return (
    <CurrentProjectProvider>
      <FreelancerHomeContent />
    </CurrentProjectProvider>
  )
}
