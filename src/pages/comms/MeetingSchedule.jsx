import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { useCommsApi } from './useCommsApi'

export default function MeetingSchedule() {
  const navigate = useNavigate()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting, isSim } = useCommsApi()
  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [projects, setProjects] = useState([])
  const [runs, setRuns] = useState([])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [runId, setRunId] = useState('')
  const [start, setStart] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      setAccountId(aid)
      const { data: auth } = await platformDb.auth.getUser()
      if (!auth?.user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
      setUserId(u?.id || null)
      if (!aid) return
      const { data: projs } = await platformDb.from('projects').select('id, project_name').eq('account_id', aid).eq('is_deleted', false).limit(100)
      setProjects(projs || [])
      if (isSim) {
        const { data: r } = await simDb.from('simulation_runs').select('id, scenario_id').eq('user_id', auth.user.id).limit(50)
        setRuns(r || [])
      }
    })()
  }, [isSim])

  const submit = async (e) => {
    e.preventDefault()
    if (!accountId || !userId || !title.trim()) return
    setSaving(true)
    setErr(null)
    try {
      if (isSim) {
        const { data, error } = await meeting.createMeeting({
          accountId,
          simulationRunId: runId || null,
          title: title.trim(),
          scheduledStart: start || null,
          organisedByUserId: userId,
        })
        if (error) throw error
        navigate(`${basePath}/meetings/${data.id}`)
      } else {
        const { data, error } = await meeting.createMeeting({
          accountId,
          projectId: projectId || null,
          title: title.trim(),
          scheduledStart: start || null,
          organisedByUserId: userId,
        })
        if (error) throw error
        navigate(`${basePath}/meetings/${data.id}`)
      }
    } catch (ex) {
      setErr(ex.message || String(ex))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Schedule meeting</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        {isSim ? (
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Simulation run (optional)
            <select value={runId} onChange={(e) => setRunId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
              <option value="">—</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Project (optional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Start
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg bg-cyan-600 text-white font-medium disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Create meeting'}
        </button>
      </form>
    </div>
  )
}
