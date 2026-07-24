import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'
import { startSimulationRun } from '../../services/sim/simRunBootstrapService'

const METHODOLOGY = [
  { id: 'traditional', label: 'Traditional / staged', desc: 'Formal gates, highlight reports, assurance cadence.' },
  { id: 'agile', label: 'Agile (Scrum)', desc: 'Sprint rhythm, impediments, lighter governance overlay.' },
  { id: 'hybrid', label: 'Hybrid', desc: 'Governance stages with iterative delivery inside execution.' },
]

const ROLES = ['project_manager', 'project_sponsor', 'programme_manager', 'team_manager', 'project_assurance']

export default function SimulationSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [methodology, setMethodology] = useState('traditional')
  const [userRole, setUserRole] = useState('project_manager')
  const [scenarioId, setScenarioId] = useState('')
  const [difficulty, setDifficulty] = useState('standard')
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await simDb
        .from('scenarios')
        .select('id,name,short_description,methodology,difficulty_level,scenario_data')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      const rows = data || []
      const npc = rows.filter((s) => s.scenario_data && typeof s.scenario_data === 'object' && s.scenario_data.v505)
      const pick = npc.length ? npc : rows.slice(0, 6)
      setScenarios(pick)
      const first = pick[0]
      if (first) setScenarioId((prev) => prev || first.id)
    })()
  }, [])

  const launch = async () => {
    setLoading(true)
    setErr(null)
    const res = await startSimulationRun({ scenarioId, userRole, methodology, difficulty })
    setLoading(false)
    if (!res.success) {
      setErr(res.error || 'Could not start')
      return
    }
    navigate(`/simulator/run/${res.runId}/dashboard`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-2">Live simulation setup</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">v505 NPC role engine — configure your run in six steps.</p>
      {err && <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}
      <div className="flex gap-2 mb-6 text-xs">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            className={`rounded px-2 py-1 ${step === n ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setStep(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {step === 1 && (
        <div className="space-y-3">
          {METHODOLOGY.map((m) => (
            <label key={m.id} className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer">
              <input type="radio" name="meth" checked={methodology === m.id} onChange={() => setMethodology(m.id)} />
              <div>
                <div className="font-medium">{m.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{m.desc}</div>
              </div>
            </label>
          ))}
          <button type="button" className="mt-4 rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setStep(2)}>
            Next
          </button>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setUserRole(r)}
                className={`rounded border px-3 py-2 text-left capitalize ${userRole === r ? 'border-blue-500 bg-blue-500/10' : 'border-gray-300 dark:border-gray-600'}`}
              >
                {r.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <button type="button" className="mt-4 rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setStep(3)}>
            Next
          </button>
        </div>
      )}
      {step === 3 && (
        <div>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="w-full rounded border border-gray-600 bg-transparent p-2">
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="mt-4 rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setStep(4)}>
            Next
          </button>
        </div>
      )}
      {step === 4 && (
        <div className="flex gap-3 flex-wrap">
          {['easy', 'standard', 'hard', 'expert'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded px-4 py-2 capitalize ${difficulty === d ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {d}
            </button>
          ))}
          <button type="button" className="block w-full mt-4 rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setStep(5)}>
            Next
          </button>
        </div>
      )}
      {step === 5 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Your NPC team will be assigned automatically from the catalogue (every role except yours).
          <button type="button" className="mt-4 block rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setStep(6)}>
            Next
          </button>
        </div>
      )}
      {step === 6 && (
        <div>
          <button
            type="button"
            disabled={loading}
            onClick={launch}
            className="rounded bg-green-600 px-6 py-3 text-white font-medium disabled:opacity-60"
          >
            {loading ? 'Launching…' : 'Launch simulation'}
          </button>
        </div>
      )}
    </div>
  )
}
