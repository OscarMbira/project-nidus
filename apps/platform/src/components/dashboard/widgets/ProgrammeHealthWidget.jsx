/**
 * Programme Health widget (v982 Phase 5 follow-up — Programme Manager Home)
 * Roll-up health across the programme's child projects — reads programme_rollup_view via the
 * existing getProgrammeRollups() (programmeService.js), not a new query.
 */
import { useState, useEffect } from 'react'
import { getProgrammeRollups } from '../../../services/programmeService'
import { useCurrentProgramme } from '../../../context/CurrentProgrammeContext'
import { Activity } from 'lucide-react'

export default function ProgrammeHealthWidget() {
  const { programmeId } = useCurrentProgramme()
  const [rollup, setRollup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!programmeId) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getProgrammeRollups(programmeId)
      if (!cancelled) {
        setRollup(res.success ? res.data : null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [programmeId])

  if (loading) return <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (!rollup) return null

  const cards = [
    { label: 'Active Projects', value: rollup.active_projects ?? 0, colour: 'text-green-600 dark:text-green-400' },
    { label: 'Completed', value: rollup.completed_projects ?? 0, colour: 'text-blue-600 dark:text-blue-400' },
    { label: 'On-Track (Green)', value: rollup.green_projects ?? 0, colour: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Avg. Progress', value: `${Math.round(rollup.average_progress_percentage ?? 0)}%`, colour: 'text-purple-600 dark:text-purple-400' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Programme Health — {rollup.programme_name}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className={`text-xl font-bold ${c.colour}`}>{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      {rollup.total_planned_benefits != null && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Benefits realised: {rollup.total_realised_benefits ?? 0} / {rollup.total_planned_benefits ?? 0}
        </p>
      )}
    </div>
  )
}
