import { useEffect, useState } from 'react'
import { simDb } from '../../../services/supabase/supabaseClient'

const ROLE_LABELS = {
  portfolio_manager: 'Portfolio Manager',
  programme_manager: 'Programme Manager',
  project_manager: 'Project Manager',
}

/**
 * Compact "how are the other two roles doing" widget for a collaborative
 * run's turn view (v736 Phase F.3). Relies on the additive cross-run SELECT
 * RLS policies added in v743 — a joined participant can already read
 * fellow participants' simulation_runs/simulation_turns rows.
 */
export default function CollaborativeRolesRollup({ collaborativeSessionId, myRunId }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!collaborativeSessionId) return
    ;(async () => {
      const { data: runs } = await simDb
        .from('simulation_runs')
        .select('id, user_id, selected_role, status')
        .eq('collaborative_session_id', collaborativeSessionId)
        .neq('id', myRunId)
      if (!runs?.length) {
        setRows([])
        return
      }
      const withTurns = await Promise.all(
        runs.map(async (r) => {
          const { data: currentTurn } = await simDb
            .from('simulation_turns')
            .select('turn_number')
            .eq('run_id', r.id)
            .in('status', ['review', 'deciding'])
            .order('turn_number', { ascending: true })
            .limit(1)
            .maybeSingle()
          return { ...r, currentTurnNumber: currentTurn?.turn_number ?? null }
        }),
      )
      setRows(withTurns)
    })()
  }, [collaborativeSessionId, myRunId])

  if (!collaborativeSessionId || rows.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Fellow roles</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{ROLE_LABELS[r.selected_role] || r.selected_role}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {r.status === 'completed'
                ? 'Complete'
                : r.currentTurnNumber
                  ? `Turn ${r.currentTurnNumber}`
                  : 'Not started'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
