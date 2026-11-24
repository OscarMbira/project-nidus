/**
 * v1354 — a project manager accepts or rejects cross-project moves. Route: schedule/level/inbox.
 */
import { useEffect, useMemo, useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createLevellingData } from '../../services/levellingData.js'

export default function LevellingInboxScreen() {
  const { projectId, loading } = useScheduleProjectId()
  const { isSim } = usePlanning()
  const api = useMemo(() => createLevellingData(isSim), [isSim])
  const { showSuccess, modal } = useSuccessModal()
  const [moves, setMoves] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    if (!projectId) return
    api.proposalsFor(projectId).then(setMoves).catch((err) => setError(err.message))
  }
  useEffect(load, [api, projectId])

  const decide = async (accepted) => {
    const byRun = new Map()
    for (const m of moves) {
      if (!byRun.has(m.run_id)) byRun.set(m.run_id, [])
      byRun.get(m.run_id).push({ id: m.id, accepted })
    }
    setBusy(true)
    setError(null)
    try {
      for (const [runId, decisions] of byRun) await api.decide(runId, decisions)
      showSuccess({ recordId: moves[0]?.run_id || 'moves', operation: 'updated', subject: 'Levelling proposal', message: accepted ? 'The moves are now on this project.' : 'The moves were rejected.' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (!projectId) return <ChooseProject />

  return (
    <FieldHelpScope helpKeys={['public.levelling_runs.scope']}>
      <ScheduleLayout title="Levelling proposals" description="Moves proposed for this project by a resource levelling run. Accept applies them. Reject leaves the dates as they are.">
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Task', 'From', 'To', 'Delay', 'Why'].map((h) => <th key={h} data-help="exempt" className="px-2 py-2 text-left text-xs text-gray-700 dark:text-gray-200">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {moves.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-gray-700 dark:text-gray-200">Nothing is waiting for a decision.</td></tr>}
              {moves.map((m) => (
                <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                  <td className="px-2 py-2">{m.task_id}</td>
                  <td className="px-2 py-2">{m.old_start}</td>
                  <td className="px-2 py-2">{m.new_start}</td>
                  <td className="px-2 py-2">{m.delay_days}</td>
                  <td className="px-2 py-2">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {moves.length > 0 && (
          <div className="flex gap-2 mt-4">
            <button type="button" disabled={busy} onClick={() => decide(true)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Accept all</button>
            <button type="button" disabled={busy} onClick={() => decide(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">Reject all</button>
          </div>
        )}
        {modal}
      </ScheduleLayout>
    </FieldHelpScope>
  )
}
