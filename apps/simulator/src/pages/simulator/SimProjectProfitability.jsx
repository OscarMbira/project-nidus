import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { listSimRevenueEntries, createSimRevenueEntry, sumAmounts } from '../../services/simProjectRevenueService'
import { listSimCostEntries } from '../../services/simProjectCostService'
import { simDb } from '../../services/supabase/supabaseClient'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function SimProjectProfitability() {
  const { projectId } = useParams()
  const [rev, setRev] = useState([])
  const [cost, setCost] = useState(0)
  const [project, setProject] = useState(null)
  const [form, setForm] = useState({ amount: '', revenue_type: 'contract_payment', revenue_date: new Date().toISOString().slice(0, 10) })

  const load = useCallback(async () => {
    const { data: p } = await simDb.from('practice_projects').select('project_name, project_code').eq('id', projectId).maybeSingle()
    setProject(p)
    setRev(await listSimRevenueEntries(projectId))
    const c = await listSimCostEntries(projectId)
    setCost(c.reduce((s, x) => s + (Number(x.amount) || 0), 0))
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const total = sumAmounts(rev)
  const gp = total - cost
  const margin = total !== 0 ? (gp / total) * 100 : null

  const addRev = async (e) => {
    e.preventDefault()
    try {
      await createSimRevenueEntry({
        practice_project_id: projectId,
        amount: form.amount,
        revenue_type: form.revenue_type,
        revenue_date: form.revenue_date,
      })
      toast.success('Revenue recorded')
      setForm({ ...form, amount: '' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/simulator/practice-projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-blue-400">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div>
              <h1 className="text-xl font-bold">Practice profitability</h1>
              <p className="text-sm text-gray-400">{project?.project_code} — {project?.project_name}</p>
            </div>
          </div>
          <ExportListMenu
            columns={[
              { key: 'revenue_date', label: 'Date' },
              { key: 'amount', label: 'Amount' },
              { key: 'revenue_type', label: 'Type' },
            ]}
            data={rev}
            baseFilename={`sim_practice_revenue_${projectId}`}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="border border-gray-800 rounded p-3">
            <div className="text-xs text-gray-500">Revenue</div>
            <div className="text-xl font-semibold tabular-nums">{total.toFixed(2)}</div>
          </div>
          <div className="border border-gray-800 rounded p-3">
            <div className="text-xs text-gray-500">Cost (actuals)</div>
            <div className="text-xl font-semibold tabular-nums">{cost.toFixed(2)}</div>
          </div>
          <div className="border border-gray-800 rounded p-3">
            <div className="text-xs text-gray-500">Gross profit / margin</div>
            <div className="text-xl font-semibold tabular-nums">{gp.toFixed(2)} {margin != null ? `(${margin.toFixed(1)}%)` : ''}</div>
          </div>
        </div>
        <form onSubmit={addRev} className="flex flex-wrap gap-2 items-end rounded-xl border border-gray-800 p-4">
          <input type="date" value={form.revenue_date} onChange={(e) => setForm({ ...form, revenue_date: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
          <select value={form.revenue_type} onChange={(e) => setForm({ ...form, revenue_type: e.target.value })} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
            <option value="contract_payment">Contract payment</option>
            <option value="milestone">Milestone</option>
            <option value="retainer">Retainer</option>
            <option value="grant">Grant</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Add revenue</button>
        </form>
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {rev.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2">{r.revenue_date}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.amount}</td>
                  <td className="px-3 py-2">{r.revenue_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
