import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { listSimEvmSnapshots, upsertSimEvmSnapshot } from '../../services/simEvmService'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'period_date', label: 'Period' },
  { key: 'planned_value', label: 'PV' },
  { key: 'earned_value', label: 'EV' },
  { key: 'actual_cost', label: 'AC' },
]

export default function SimProjectEVMPage() {
  const { projectId } = useParams()
  const [rows, setRows] = useState([])
  const [uid, setUid] = useState(null)
  const [form, setForm] = useState({ period_date: new Date().toISOString().slice(0, 10), planned_value: '', earned_value: '', actual_cost: '' })

  const load = useCallback(async () => {
    setRows(await listSimEvmSnapshots(projectId))
    const { data: { user } } = await simDb.auth.getUser()
    if (user) {
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      setUid(u?.id || null)
    }
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!uid) return
    try {
      await upsertSimEvmSnapshot({
        practice_project_id: projectId,
        period_date: form.period_date,
        planned_value: Number(form.planned_value) || 0,
        earned_value: Number(form.earned_value) || 0,
        actual_cost: Number(form.actual_cost) || 0,
        created_by_user_id: uid,
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
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename={`sim_practice_evm_${projectId}`} disabled={!rows.length} />
        </div>
        <h1 className="text-xl font-bold">Practice EVM</h1>
        <form onSubmit={save} className="flex flex-wrap gap-2 rounded-xl border border-gray-800 p-4">
          <input type="date" value={form.period_date} onChange={(e) => setForm({ ...form, period_date: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="PV" value={form.planned_value} onChange={(e) => setForm({ ...form, planned_value: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="EV" value={form.earned_value} onChange={(e) => setForm({ ...form, earned_value: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="AC" value={form.actual_cost} onChange={(e) => setForm({ ...form, actual_cost: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">Save</button>
        </form>
        <table className="min-w-full text-sm border border-gray-800 rounded">
          <thead className="bg-gray-900">
            <tr>
                <TableRowNumberHeader className="!normal-case" /><th className="px-2 py-1 text-left">Period</th><th className="px-2 py-1">PV</th><th className="px-2 py-1">EV</th><th className="px-2 py-1">AC</th></tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr key={r.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-2 py-1">{r.period_date}</td>
                <td className="px-2 py-1 text-right">{r.planned_value}</td>
                <td className="px-2 py-1 text-right">{r.earned_value}</td>
                <td className="px-2 py-1 text-right">{r.actual_cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
