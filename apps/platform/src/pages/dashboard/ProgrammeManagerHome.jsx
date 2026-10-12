/**
 * Programme Manager Home (v982 Phase 5 follow-up — Role-Aware Home Pages)
 * Mirrors PortfolioManagerHome.jsx exactly, substituting programme scope.
 */
import { CurrentProgrammeProvider, useCurrentProgramme } from '../../lib/CurrentProgrammeContext'
import DashboardFramework from '../../components/dashboard/DashboardFramework'
import { useDashboardViewerContext } from '../../components/dashboard/useDashboardViewerContext'
import { PROGRAMME_MANAGER_HOME_WIDGETS } from '../../components/dashboard/widgetRegistry'

function ProgrammeManagerHomeContent() {
  const { programmes, programmeId, currentProgramme, setProgrammeId, loading: programmesLoading } = useCurrentProgramme()
  const { context } = useDashboardViewerContext({ programmeId })

  if (programmesLoading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading your programmes…</div>
  }

  if (programmes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Programme Manager Home</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're not an explicit member of any programme yet — ask a PMO Admin or Portfolio Manager to grant you a Programme Manager role from the programme's Members page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardFramework
      widgets={PROGRAMME_MANAGER_HOME_WIDGETS}
      viewerContext={context}
      title="Programme Manager Home"
      subtitle={currentProgramme ? `Viewing ${currentProgramme.name}` : undefined}
      headerExtra={
        programmes.length > 1 && (
          <select
            value={programmeId || ''}
            onChange={(e) => setProgrammeId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
          >
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )
      }
    />
  )
}

export default function ProgrammeManagerHome() {
  return (
    <CurrentProgrammeProvider>
      <ProgrammeManagerHomeContent />
    </CurrentProgrammeProvider>
  )
}
