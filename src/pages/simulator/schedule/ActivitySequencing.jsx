import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import {
  simListDependencies,
  simSaveDependency,
  simSoftDeleteDependency,
  simListActivities,
} from '../../../services/sim/simPlanningService'
import ActivityNetworkDiagram from '../../../components/schedule/ActivityNetworkDiagram'
import ExportListMenu from '../../../components/ui/ExportListMenu'

const COLS = [
  { key: 'pred', label: 'Predecessor' },
  { key: 'succ', label: 'Successor' },
  { key: 'dependency_type', label: 'Type' },
  { key: 'lag_days', label: 'Lag (days)' },
]

export default function ActivitySequencing() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const [deps, setDeps] = useState([])
  const [acts, setActs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    predecessor_activity_id: '',
    successor_activity_id: '',
    dependency_type: 'FS',
    lag_days: 0,
    dependency_category: '',
    notes: '',
  })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [d, a] = await Promise.all([simListDependencies(projectId), simListActivities(projectId)])
    if (d.success) setDeps(d.data || [])
    if (a.success) setActs(a.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const nameById = Object.fromEntries((acts || []).map((x) => [x.id, x.name || x.activity_code || x.id]))

  const tableData = deps.map((r) => ({
    ...r,
    pred: nameById[r.predecessor_activity_id] || r.predecessor_activity_id,
    succ: nameById[r.successor_activity_id] || r.successor_activity_id,
  }))

  const addDep = async () => {
    if (!projectId || !canEdit) return
    setMsg(null)
    if (!form.predecessor_activity_id || !form.successor_activity_id) {
      setMsg('Select predecessor and successor.')
      return
    }
    const res = await simSaveDependency(projectId, {
      predecessor_activity_id: form.predecessor_activity_id,
      successor_activity_id: form.successor_activity_id,
      dependency_type: form.dependency_type,
      lag_days: Number(form.lag_days) || 0,
      dependency_category: form.dependency_category || null,
      notes: form.notes || null,
    })
    if (res.success) {
      setForm((f) => ({ ...f, notes: '' }))
      load()
    } else setMsg(res.error)
  }

  const remove = async (id) => {
    if (!canEdit) return
    if (!window.confirm('Remove this dependency?')) return
    const res = await simSoftDeleteDependency(id, projectId)
    if (res.success) load()
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Activity sequencing</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity sequencing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Predecessors and successors (PMBOK 5.8).</p>
        </div>
        <ExportListMenu columns={COLS} data={tableData} baseFilename={`ActivityDeps_${projectId}`} />
      </div>

      <ActivityNetworkDiagram dependencies={deps} activityNameById={nameById} />

      {canEdit && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Add dependency</h2>
          {msg && <p className="mb-2 text-sm text-amber-600 dark:text-amber-400">{msg}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={form.predecessor_activity_id}
              onChange={(e) => setForm((f) => ({ ...f, predecessor_activity_id: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Predecessor…</option>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.activity_code || '') + ' ' + a.name}
                </option>
              ))}
            </select>
            <select
              value={form.successor_activity_id}
              onChange={(e) => setForm((f) => ({ ...f, successor_activity_id: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Successor…</option>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.activity_code || '') + ' ' + a.name}
                </option>
              ))}
            </select>
            <select
              value={form.dependency_type}
              onChange={(e) => setForm((f) => ({ ...f, dependency_type: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="FS">FS</option>
              <option value="SS">SS</option>
              <option value="FF">FF</option>
              <option value="SF">SF</option>
            </select>
            <input
              type="number"
              value={form.lag_days}
              onChange={(e) => setForm((f) => ({ ...f, lag_days: e.target.value }))}
              placeholder="Lag days"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button type="button" onClick={addDep} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
            Add
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-3 text-left">Predecessor</th>
              <th className="p-3 text-left">Successor</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Lag</th>
              {canEdit && <th className="p-3"> </th>}
            </tr>
          </thead>
          <tbody>
            {tableData.map((r) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3">{r.pred}</td>
                <td className="p-3">{r.succ}</td>
                <td className="p-3">{r.dependency_type}</td>
                <td className="p-3">{r.lag_days}</td>
                {canEdit && (
                  <td className="p-3">
                    <button type="button" className="text-red-600 dark:text-red-400" onClick={() => remove(r.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
