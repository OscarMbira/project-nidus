/**
 * v1355 — saved analyses, newest first, opening one shows its result.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import { usePlanning } from '../../context/PlanningContext.jsx'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'
import { createQraData } from '../../services/qraData.js'

export default function QraRunsScreen() {
  const navigate = useNavigate()
  const { isSim } = usePlanning()
  const { projectId } = useScheduleProjectId()
  const api = createQraData(isSim)
  const regional = useRegionalFormatSettings(isSim ? null : projectId)
  const [runs, setRuns] = useState([])
  const [error, setError] = useState(null)
  const [picked, setPicked] = useState([])

  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    api.listRuns(projectId).then((rows) => { if (!cancelled) setRuns(rows) }).catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!projectId) return <p className="text-gray-700 dark:text-gray-200">Choose a project to see saved analyses.</p>
  if (error) return <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  const compared = runs.filter((run) => picked.includes(run.id))
  function toggle(id) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      return [...current, id].slice(-2)
    })
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
          <tr>
            <TableRowNumberHeader />
            <th className="px-3 py-2 text-left"><span className="sr-only">Compare</span></th>
            <th className="px-3 py-2 text-left">Reference</th>
            <th className="px-3 py-2 text-left">Saved</th>
            <th className="px-3 py-2 text-left">Iterations</th>
            <th className="px-3 py-2 text-left">80% finish</th>
            <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, index) => (
            <tr key={run.id} className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
              <TableRowNumberCell number={getDisplayRowNumber(index)} />
              <td className="px-3 py-2"><input type="checkbox" aria-label={`Compare ${run.display_id || 'analysis'}`} checked={picked.includes(run.id)} onChange={() => toggle(run.id)} /></td>
              <td className="px-3 py-2 font-mono">{run.display_id || '—'}</td>
              <td className="px-3 py-2">{formatRegionalDate(run.created_at?.slice?.(0, 10), regional)}</td>
              <td className="px-3 py-2">{run.iterations?.toLocaleString()}</td>
              <td className="px-3 py-2">{formatRegionalDate(run.summary?.schedule?.p80, regional)}</td>
              <td className="px-3 py-2 text-right">
                <RowActionButton variant="view" label="View analysis" onClick={() => navigate(`../results/${run.id}`)} />
              </td>
            </tr>
          ))}
          {runs.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-700 dark:text-gray-200">No analysis has been saved for this project.</td></tr>}
        </tbody>
      </table>
      {compared.length === 2 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-800 dark:text-gray-100">
          <p className="font-medium mb-2">Compared</p>
          <ul>
            {compared.map((run) => (
              <li key={run.id}>{run.display_id || 'Analysis'}: 50% {formatRegionalDate(run.summary?.schedule?.p50, regional)} · 80% {formatRegionalDate(run.summary?.schedule?.p80, regional)} · 90% {formatRegionalDate(run.summary?.schedule?.p90, regional)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
