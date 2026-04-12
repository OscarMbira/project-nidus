import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listCostEntries } from '../../services/projectCostService'
import { sumAmounts } from '../../services/projectRevenueService'

export default function ProgrammeFinancialDashboard() {
  const { id: programmeId } = useParams()
  const [programme, setProgramme] = useState(null)
  const [rows, setRows] = useState([])
  const [rollup, setRollup] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: prog } = await platformDb.from('programmes').select('programme_name, programme_code').eq('id', programmeId).single()
      setProgramme(prog)
      const { data: rv, error: rvErr } = await platformDb
        .from('programme_financial_rollups')
        .select('*')
        .eq('programme_id', programmeId)
        .maybeSingle()
      setRollup(rvErr ? null : rv || null)
      const { data: links } = await platformDb.from('programme_projects').select('project_id').eq('programme_id', programmeId)
      const ids = (links || []).map((l) => l.project_id).filter(Boolean)
      if (!ids.length) {
        setRows([])
        return
      }
      const { data: projs } = await platformDb.from('projects').select('id, project_name, project_code').in('id', ids)
      const out = []
      for (const p of projs || []) {
        const costs = await listCostEntries(p.id)
        const { data: rev } = await platformDb.from('project_revenue_entries').select('amount').eq('project_id', p.id).eq('is_deleted', false)
        out.push({
          ...p,
          totalCost: costs.reduce((s, c) => s + (Number(c.amount) || 0), 0),
          totalRev: sumAmounts(rev || []),
        })
      }
      setRows(out)
    })()
  }, [programmeId])

  const exportData = rows.map((r) => ({
    project_code: r.project_code,
    project_name: r.project_name,
    total_cost: r.totalCost,
    total_revenue: r.totalRev,
    variance: r.totalRev - r.totalCost,
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/platform/programme/${programmeId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Programme financial dashboard</h1>
              <p className="text-sm text-gray-500">{programme?.programme_code} — {programme?.programme_name}</p>
            </div>
          </div>
          <ExportListMenu
            columns={[
              { key: 'project_code', label: 'Code' },
              { key: 'project_name', label: 'Project' },
              { key: 'total_cost', label: 'Total cost' },
              { key: 'total_revenue', label: 'Total revenue' },
              { key: 'variance', label: 'Variance' },
            ]}
            data={exportData}
            baseFilename={`programme_financial_${programmeId}`}
          />
        </div>
        {rollup && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Projects</div>
              <div className="font-semibold tabular-nums">{rollup.project_count ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Total actual cost</div>
              <div className="font-semibold tabular-nums">{Number(rollup.total_actual_cost || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Total revenue</div>
              <div className="font-semibold tabular-nums">{Number(rollup.total_revenue || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Variance</div>
              <div className="font-semibold tabular-nums">{Number(rollup.cost_variance || 0).toFixed(2)}</div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-right">Total cost</th>
                <th className="px-3 py-2 text-right">Total revenue</th>
                <th className="px-3 py-2 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{r.project_code}</td>
                  <td className="px-3 py-2">
                    <Link className="text-blue-400 hover:underline" to={`/platform/projects/${r.id}/profitability`}>{r.project_name}</Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.totalCost.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.totalRev.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(r.totalRev - r.totalCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
