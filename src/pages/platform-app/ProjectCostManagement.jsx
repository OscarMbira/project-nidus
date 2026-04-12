import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { listCostEntries, createCostEntry, deleteCostEntry } from '../../services/projectCostService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useFinancialPermissions } from '../../hooks/useFinancialPermissions'

const VIEW_KEY = 'proj-cost-view'

export default function ProjectCostManagement() {
  const { projectId } = useParams()
  const { canManage, readOnlyExecutive } = useFinancialPermissions()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'table')
  const [project, setProject] = useState(null)
  const [form, setForm] = useState({ amount: '', description: '', entry_date: new Date().toISOString().slice(0, 10) })
  const [uid, setUid] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data: p } = await platformDb.from('projects').select('project_name, project_code').eq('id', projectId).single()
      setProject(p)
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
      setRows(await listCostEntries(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed to load costs')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  const addRow = async (e) => {
    e.preventDefault()
    if (!canManage || readOnlyExecutive) return
    if (!uid) return
    try {
      await createCostEntry({
        project_id: projectId,
        amount: form.amount,
        description: form.description,
        entry_date: form.entry_date,
        entered_by_user_id: uid,
      })
      toast.success('Cost entry saved')
      setForm({ ...form, amount: '', description: '' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    }
  }

  const exportCols = [
    { key: 'entry_date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'description', label: 'Description' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Cost management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{project?.project_code} — {project?.project_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportCols} data={rows} baseFilename={`project_costs_${projectId}`} />
            <button type="button" onClick={() => setView('table')} className={`p-2 rounded border ${view === 'table' ? 'bg-blue-600 text-white' : 'border-gray-600'}`} aria-label="Table">
              <List className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setView('cards')} className={`p-2 rounded border ${view === 'cards' ? 'bg-blue-600 text-white' : 'border-gray-600'}`} aria-label="Cards">
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>

        {canManage && !readOnlyExecutive && (
          <form onSubmit={addRow} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm md:col-span-2" />
            <button type="submit" className="md:col-span-4 justify-self-end px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Add entry</button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : view === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  {canManage && !readOnlyExecutive && <th className="px-4 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{r.entry_date}</td>
                    <td className="px-4 py-2 tabular-nums">{r.amount} {r.currency}</td>
                    <td className="px-4 py-2">{r.description || '—'}</td>
                    {canManage && !readOnlyExecutive && (
                      <td className="px-4 py-2 text-right">
                        <button type="button" className="text-red-600 text-xs" onClick={() => deleteCostEntry(r.id).then(load)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-center text-gray-500">No cost entries yet.</p>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="text-xs text-gray-500">{r.entry_date}</div>
                <div className="text-lg font-semibold tabular-nums">{r.amount} {r.currency}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{r.description || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
