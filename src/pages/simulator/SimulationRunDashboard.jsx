import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { simDb } from '../../services/supabase/supabaseClient'
import SimHealthGauges from '../../components/sim/SimHealthGauges'
import SimPhaseProgressBar from '../../components/sim/SimPhaseProgressBar'
import SimEVMPanel from '../../components/sim/SimEVMPanel'
import SimNPCTeamView from '../../components/sim/SimNPCTeamView'
import SimActivityFeed from '../../components/sim/SimActivityFeed'
import { tickSimulationClock } from '../../services/sim/simNPCEngineService'
import { getPendingEvents } from '../../services/sim/simNPCEngineService'

export default function SimulationRunDashboard() {
  const { runId } = useParams()
  const { theme } = useTheme()
  const [run, setRun] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [pending, setPending] = useState(0)
  const [tickMsg, setTickMsg] = useState('')
  const [feed, setFeed] = useState([])

  const load = async () => {
    const { data: r } = await simDb.from('simulation_runs').select('*').eq('id', runId).single()
    setRun(r || null)
    const { data: asn } = await simDb.from('npc_run_assignments').select('*').eq('run_id', runId)
    const ids = [...new Set((asn || []).map((a) => a.npc_character_id).filter(Boolean))]
    const { data: chars } = ids.length ? await simDb.from('npc_characters').select('*').in('id', ids) : { data: [] }
    const merged = (asn || []).map((a) => ({
      ...a,
      npc_characters: (chars || []).find((c) => c.id === a.npc_character_id),
    }))
    setAssignments(merged)
    const pe = await getPendingEvents(runId)
    setPending((pe.data || []).length)
    const { data: acts } = await simDb
      .from('npc_autonomous_actions')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(12)
    setFeed(
      (acts || []).map((a) => ({
        at: new Date(a.created_at).toLocaleString(),
        text: `${a.action_type}: ${a.action_description}`,
      })),
    )
  }

  useEffect(() => {
    if (runId) load()
  }, [runId])

  const advance = async () => {
    setTickMsg('')
    const res = await tickSimulationClock(runId)
    if (!res.success) setTickMsg(res.error || 'Tick failed')
    await load()
  }

  if (!run) return <div className="p-8 text-center text-gray-500">Loading run…</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Simulation dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Day {run.sim_day || 1}
            {run.sim_start_date ? ` · started ${run.sim_start_date}` : ''}
          </p>
        </div>
        <button type="button" onClick={advance} className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-medium">
          Advance day
        </button>
      </div>
      {tickMsg && <div className="text-sm text-red-600">{tickMsg}</div>}
      <SimPhaseProgressBar activeStage={run.active_stage || 'initiation'} theme={theme} />
      <div className="grid lg:grid-cols-2 gap-6">
        <section className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
          <h2 className="font-semibold mb-3">Project health</h2>
          <SimHealthGauges health={run.project_health} theme={theme} />
        </section>
        <section className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
          <h2 className="font-semibold mb-3">EVM snapshot</h2>
          <SimEVMPanel evm={run.evm_snapshot} theme={theme} />
          <Link className="mt-3 inline-block text-sm text-blue-600" to={`/simulator/run/${runId}/evm`}>
            Open EVM dashboard
          </Link>
        </section>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm" to={`/simulator/run/${runId}/inbox`}>
          Event inbox ({pending})
        </Link>
        <Link className="rounded-lg border border-gray-600 px-4 py-2 text-sm" to={`/simulator/run/${runId}/stage-gate/${run.active_stage || 'initiation'}`}>
          Stage gate
        </Link>
        <Link className="rounded-lg border border-gray-600 px-4 py-2 text-sm" to={`/simulator/run/${runId}/exception`}>
          Exception flow
        </Link>
      </div>
      <section className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
        <h2 className="font-semibold mb-3">NPC team</h2>
        <SimNPCTeamView assignments={assignments} theme={theme} />
      </section>
      <section className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
        <h2 className="font-semibold mb-3">Activity</h2>
        <SimActivityFeed items={feed} theme={theme} />
      </section>
    </div>
  )
}
