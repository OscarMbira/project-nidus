import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'
import { getSimAuthUserId } from '../../services/sim/simAuth'

export default function SimulationRunHistory() {
  const [runs, setRuns] = useState([])

  useEffect(() => {
    ;(async () => {
      const uid = await getSimAuthUserId()
      const { data } = await simDb
        .from('simulation_runs')
        .select('id,status,started_at,completed_at,total_score,user_role,methodology,simulation_state')
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(40)
      const npc = (data || []).filter((r) => r.simulation_state?.v505)
      setRuns(npc.length ? npc : data || [])
    })()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">My simulation runs</h1>
      <table className="w-full text-sm border border-gray-700">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 text-left">Started</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Methodology</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Score</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-gray-700">
              <td className="p-2">{r.started_at?.slice(0, 10)}</td>
              <td className="p-2 capitalize">{r.user_role?.replace(/_/g, ' ')}</td>
              <td className="p-2">{r.methodology}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2">{r.total_score ?? '—'}</td>
              <td className="p-2">
                <Link className="text-blue-400" to={`/simulator/run/${r.id}/debrief`}>
                  Debrief
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
