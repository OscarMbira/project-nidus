import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { listRevenueEntries, createRevenueEntry, sumAmounts } from '../../services/projectRevenueService'
import { listCostEntries } from '../../services/projectCostService'
import { useFinancialPermissions } from '../../hooks/useFinancialPermissions'

export default function ProjectProfitability() {
  const { projectId } = useParams()
  const { canManage, readOnlyExecutive } = useFinancialPermissions()
  const [project, setProject] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [costTotal, setCostTotal] = useState(0)
  const [form, setForm] = useState({ amount: '', revenue_type: 'contract_payment', revenue_date: new Date().toISOString().slice(0, 10) })

  const load = useCallback(async () => {
    const { platformDb } = await import('../../services/supabase/supabaseClient')
    const { data: p } = await platformDb.from('projects').select('project_name, project_code').eq('id', projectId).single()
    setProject(p)
    const rev = await listRevenueEntries(projectId)
    setRevenue(rev)
    const costs = await listCostEntries(projectId)
    setCostTotal(costs.reduce((s, c) => s + (Number(c.amount) || 0), 0))
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const revTotal = sumAmounts(revenue)
  const gp = revTotal - costTotal
  const margin = revTotal !== 0 ? (gp / revTotal) * 100 : null

  const addRev = async (e) => {
    e.preventDefault()
    if (!canManage || readOnlyExecutive) return
    try {
      await createRevenueEntry({ project_id: projectId, amount: form.amount, revenue_type: form.revenue_type, revenue_date: form.revenue_date })
      toast.success('Revenue recorded')
      setForm({ ...form, amount: '' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Profitability</h1>
              <p className="text-sm text-gray-500">{project?.project_code} — {project?.project_name}</p>
            </div>
          </div>
          <ExportListMenu
            columns={[
              { key: 'revenue_date', label: 'Date' },
              { key: 'amount', label: 'Amount' },
              { key: 'revenue_type', label: 'Type' },
            ]}
            data={revenue}
            baseFilename={`project_revenue_${projectId}`}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs text-gray-500">Total revenue</div>
            <div className="text-2xl font-semibold tabular-nums">{revTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs text-gray-500">Total cost (actuals)</div>
            <div className="text-2xl font-semibold tabular-nums">{costTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs text-gray-500">Gross profit / margin</div>
            <div className="text-2xl font-semibold tabular-nums">{gp.toFixed(2)} {margin != null ? `(${margin.toFixed(1)}%)` : ''}</div>
          </div>
        </div>
        {canManage && !readOnlyExecutive && (
          <form onSubmit={addRev} className="flex flex-wrap gap-2 items-end rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <input type="date" value={form.revenue_date} onChange={(e) => setForm({ ...form, revenue_date: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <select value={form.revenue_type} onChange={(e) => setForm({ ...form, revenue_type: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm">
              <option value="contract_payment">Contract payment</option>
              <option value="milestone">Milestone</option>
              <option value="retainer">Retainer</option>
              <option value="grant">Grant</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Add revenue</button>
          </form>
        )}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
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
