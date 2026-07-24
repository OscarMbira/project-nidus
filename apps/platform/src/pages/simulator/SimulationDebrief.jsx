import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'

export default function SimulationDebrief() {
  const { runId } = useParams()
  const [run, setRun] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await simDb.from('simulation_runs').select('*').eq('id', runId).single()
      setRun(data)
    })()
  }, [runId])

  if (!run) return <div className="p-8 text-center">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Simulation debrief</h1>
      <p className="text-gray-600 dark:text-gray-400 text-sm">Run {runId}</p>
      <div className="rounded-xl border border-gray-700 p-4 space-y-2">
        <div>Score: <strong>{run.total_score ?? '—'}</strong></div>
        <div>Methodology: {run.methodology}</div>
        <div>Role: {run.user_role}</div>
        <div>Final health snapshot:</div>
        <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto">{JSON.stringify(run.project_health, null, 2)}</pre>
      </div>
      <Link to="/simulator/runs" className="text-blue-400">
        ← Back to history
      </Link>
    </div>
  )
}
