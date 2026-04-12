import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listReleases, saveRelease } from '../../services/agileReleaseService'
import { platformProjectPath } from '../../utils/projectRouteParam'

export default function AgileReleases() {
  const { projectId, routeKey, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ release_name: '', target_date: '', release_goal: '' })

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      setRows(await listReleases(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const create = async (e) => {
    e.preventDefault()
    if (!projectId || !form.release_name.trim()) return
    try {
      const r = await saveRelease({
        project_id: projectId,
        release_name: form.release_name.trim(),
        target_date: form.target_date || null,
        release_goal: form.release_goal || null,
        release_status: 'planned',
      })
      toast.success(`Release created (id: ${r.id})`)
      setForm({ release_name: '', target_date: '', release_goal: '' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  if (pidLoading || loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">Agile releases</h1>

      <form onSubmit={create} className="mb-8 flex flex-wrap gap-2 max-w-3xl">
        <input
          placeholder="Release name"
          value={form.release_name}
          onChange={(e) => setForm({ ...form, release_name: e.target.value })}
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1 min-w-[160px]"
        />
        <input
          type="date"
          value={form.target_date}
          onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm"
        />
        <input
          placeholder="Goal"
          value={form.release_goal}
          onChange={(e) => setForm({ ...form, release_goal: e.target.value })}
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1 min-w-[200px]"
        />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Create
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex justify-between gap-4">
            <div>
              <div className="font-semibold text-white">{r.release_name}</div>
              <div className="text-xs text-gray-500">{r.release_status}</div>
            </div>
            <Link
              to={`${platformProjectPath(routeKey, 'scrum', 'releases', r.id)}`}
              className="text-blue-400 text-sm self-center"
            >
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
