import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { simDb } from '../../../services/supabase/supabaseClient'
import { createCollaborativeSession, listMyCollaborativeSessions } from '../../../services/sim/simCollaborativeSessionService'

const STATUS_STYLES = {
  forming: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  abandoned: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/30',
}

export default function CollaborativeSessionLobby() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [scenarioId, setScenarioId] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    const [sessRes, { data: scenarioRows }] = await Promise.all([
      listMyCollaborativeSessions(),
      simDb.from('scenarios').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    if (sessRes.success) setSessions(sessRes.data)
    setScenarios(scenarioRows || [])
    if (!scenarioId && scenarioRows?.length) setScenarioId(scenarioRows[0].id)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!scenarioId) return
    setCreating(true)
    setErr(null)
    const res = await createCollaborativeSession(scenarioId)
    setCreating(false)
    if (!res.success) {
      setErr(res.error || 'Could not create session')
      return
    }
    navigate(`/simulator/collaborative/session/${res.data.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-2">PMO Practice — Collaborative sessions</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Convene a session where three colleagues each play Portfolio, Programme, and Project Manager in the same
        scenario at once.
      </p>

      {err && <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap gap-2">
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="flex-1 min-w-[200px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={creating || !scenarioId}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Convene a session'}
        </button>
      </form>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded">
        {sessions.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No sessions yet.</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(`/simulator/collaborative/session/${s.id}`)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <div>
              <p className="text-sm font-medium">{s.scenarios?.name || 'Scenario'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(s.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[s.status] || STATUS_STYLES.forming}`}>
              {s.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
