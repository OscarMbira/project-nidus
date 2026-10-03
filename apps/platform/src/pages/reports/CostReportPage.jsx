/**
 * Cost Report (taxonomy §3, Reports > Cost Report). New dedicated report page — budget vs
 * actual summary plus the existing Cost Actuals ledger, exportable. No new tables; thin
 * wrapper over existing services (rule 66 — one Promise.all, no sequential waterfall).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getProjectDetail } from '../../services/projectService'
import { listCostActuals } from '../../services/costActualsService'

const REPORT_COLUMNS = [
  { key: 'transaction_date', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'transaction_type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
]

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function CostReportPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [project, setProject] = useState(null)
  const [costActuals, setCostActuals] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [projectRes, actualsRes] = await Promise.all([
        getProjectDetail(projectId),
        listCostActuals(projectId),
      ])
      if (projectRes.success) setProject(projectRes.data)
      setCostActuals(actualsRes.success ? actualsRes.data : [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load cost report')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const exportRows = useMemo(() => costActuals.map((c) => ({
    transaction_date: formatDate(c.transaction_date),
    category: c.category || '—',
    transaction_type: c.transaction_type || '—',
    description: c.description || '—',
    amount: fmtMoney(c.amount),
  })), [costActuals])

  const totalActual = costActuals.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const budget = project?.budget_amount != null ? Number(project.budget_amount) : null
  const variance = budget != null ? budget - totalActual : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/platform/reports${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Cost Report
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Budget vs actual spend and the cost actuals ledger</p>
            </div>
          </div>
          <ExportListMenu columns={REPORT_COLUMNS} data={exportRows} baseFilename="Cost_Report" disabled={exportRows.length === 0} />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DashboardStatCard label="Budget" value={fmtMoney(budget)} />
              <DashboardStatCard label="Actual Spend" value={fmtMoney(totalActual)} />
              <DashboardStatCard label="Variance" value={fmtMoney(variance)} accentClassName={variance != null && variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {exportRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No cost actuals recorded yet.</td></tr>
                  ) : exportRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{row.transaction_date}</td>
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">{row.transaction_type}</td>
                      <td className="px-4 py-2">{row.description}</td>
                      <td className="px-4 py-2 text-right font-medium">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
