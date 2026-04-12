import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { listSimCostEntries, createSimCostEntry } from '../../services/simProjectCostService'
import { simDb, platformDb } from '../../services/supabase/supabaseClient'

const EXPORT_COLS = [
  { key: 'entry_date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'description', label: 'Description' },
  { key: 'approval_status', label: 'Approval' },
]

export default function SimProjectCostManagement() {
  const { projectId } = useParams()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ amount: '', description: '', entry_date: new Date().toISOString().slice(0, 10) })
  const [uid, setUid] = useState(null)

  const load = useCallback(async () => {
    setRows(await listSimCostEntries(projectId))
    const { data: { user } } = await simDb.auth.getUser()
    if (user) {
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      setUid(u?.id || null)
    }
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!uid) return
    try {
      await createSimCostEntry({
        practice_project_id: projectId,
        amount: form.amount,
        description: form.description,
        entry_date: form.entry_date,
        entered_by_user_id: uid,
      })
      toast.success('Saved')
      load()
    } catch (err) {
      toast.error(err?.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={`/simulator/practice-projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-blue-400">
            <ArrowLeft className="h-4 w-4" /> Back to practice project
          </Link>
          <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename={`sim_practice_costs_${projectId}`} disabled={!rows.length} />
        </div>
        <h1 className="text-xl font-bold">Practice cost management</h1>
        <form onSubmit={submit} className="grid md:grid-cols-4 gap-2 rounded-xl border border-gray-800 p-4">
          <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <button type="submit" className="md:col-span-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm w-fit">Add</button>
        </form>
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="border border-gray-800 rounded p-3">{r.entry_date} — {r.amount} {r.currency}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
