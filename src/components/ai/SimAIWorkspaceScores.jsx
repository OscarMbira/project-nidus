/**
 * SimAIWorkspaceScores.jsx (Phase 7.9)
 * Right panel: module score breakdown for selected run; compare with another run; export Excel/PDF/Print.
 */

import { useState, useEffect } from 'react'
import { BarChart3, FileDown, Printer } from 'lucide-react'
import { getModuleScoresForRun, getPastDebriefs } from '../../services/simAICoachService'
import { supabase } from '../../services/supabaseClient'

export default function SimAIWorkspaceScores({ runId, runSummary }) {
  const [scores, setScores] = useState([])
  const [compareRunId, setCompareRunId] = useState(null)
  const [compareScores, setCompareScores] = useState([])
  const [otherRuns, setOtherRuns] = useState([])

  useEffect(() => {
    if (!runId) {
      setScores([])
      setCompareScores([])
      return
    }
    getModuleScoresForRun(runId).then(setScores)
    setCompareRunId(null)
    setCompareScores([])
  }, [runId])

  useEffect(() => {
    if (!compareRunId) {
      setCompareScores([])
      return
    }
    getModuleScoresForRun(compareRunId).then(setCompareScores)
  }, [compareRunId])

  useEffect(() => {
    if (!runId) return
    const loadRuns = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const debriefs = await getPastDebriefs(user.id)
      setOtherRuns(debriefs.filter((d) => d.run_id && d.run_id !== runId))
    }
    loadRuns()
  }, [runId])

  const pct = (s) => (s?.percentage != null ? Number(s.percentage) : (s?.max_score ? Math.round((s.score / s.max_score) * 100) : 0))
  const barColor = (n) => (n >= 80 ? 'bg-green-500' : n >= 60 ? 'bg-yellow-500' : 'bg-red-500')

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
        <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm text-center">Select a debrief to see module scores.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-200">Module Scores</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
      {runSummary && (
        <div className="px-3 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400">Overall</p>
          <p className={`text-lg font-bold ${runSummary.total_score >= 80 ? 'text-green-400' : runSummary.total_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {runSummary.total_score ?? 0}%
            {runSummary.total_score >= 60 ? ' (Pass)' : ' (Review)'}
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {scores.map((row) => (
          <div key={row.id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 truncate">{row.module_name || row.module_type || 'Module'}</span>
              <span className="text-gray-200 font-medium">{pct(row)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(pct(row))}`}
                style={{ width: `${Math.min(100, pct(row))}%` }}
              />
            </div>
          </div>
        ))}
        {otherRuns.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <label className="text-xs text-gray-400 block mb-1">Compare with another run</label>
            <select
              value={compareRunId || ''}
              onChange={(e) => setCompareRunId(e.target.value || null)}
              className="w-full text-sm bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-gray-200"
            >
              <option value="">—</option>
              {otherRuns.slice(0, 10).map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : r.run_id?.slice(0, 8)}
                </option>
              ))}
            </select>
            {compareScores.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">Other run</p>
                {compareScores.map((row) => (
                  <div key={row.id} className="flex justify-between text-xs text-gray-400">
                    <span className="truncate">{row.module_name || row.module_type}</span>
                    <span>{pct(row)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
