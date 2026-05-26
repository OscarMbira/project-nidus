import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { simDb } from '../../services/supabase/supabaseClient'
import { listSimEvmSnapshots } from '../../services/simEvmService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'project_code', label: 'Project code' },
  { key: 'project_name', label: 'Project name' },
  { key: 'period_date', label: 'Period' },
  { key: 'planned_value', label: 'PV' },
  { key: 'earned_value', label: 'EV' },
  { key: 'actual_cost', label: 'AC' },
]

export default function SimPortfolioEVMPage() {
  const [portfolios, setPortfolios] = useState([])
  const [selected, setSelected] = useState(null)
  const [rollup, setRollup] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data: ports } = await simDb
        .from('practice_portfolios')
        .select('id, portfolio_name, portfolio_code')
        .eq('is_deleted', false)
        .limit(50)
      setPortfolios(ports || [])
    })()
  }, [])

  useEffect(() => {
    if (!selected) {
      setRollup([])
      return
    }
    ;(async () => {
      const { data: progLinks } = await simDb
        .from('practice_programmes')
        .select('id')
        .eq('practice_portfolio_id', selected)
        .eq('is_deleted', false)
      const progIds = (progLinks || []).map((p) => p.id)
      if (!progIds.length) {
        setRollup([])
        return
      }
      const { data: pp } = await simDb
        .from('practice_programme_projects')
        .select('practice_project_id')
        .in('practice_programme_id', progIds)
      const projectIds = [...new Set((pp || []).map((x) => x.practice_project_id).filter(Boolean))]
      if (!projectIds.length) {
        setRollup([])
        return
      }
      const { data: projs } = await simDb
        .from('practice_projects')
        .select('id, project_name, project_code')
        .in('id', projectIds)
      const rows = []
      for (const p of projs || []) {
        const snaps = await listSimEvmSnapshots(p.id)
        const last = snaps[snaps.length - 1]
        if (last) rows.push({ project: p, last })
      }
      setRollup(rows)
    })()
  }, [selected])

  const exportRows = useMemo(
    () =>
      rollup.map(({ project, last }) => ({
        project_code: project.project_code,
        project_name: project.project_name,
        period_date: last.period_date,
        planned_value: last.planned_value,
        earned_value: last.earned_value,
        actual_cost: last.actual_cost,
      })),
    [rollup]
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/simulator/practice-portfolio"
              className="p-2 rounded-lg border border-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Practice portfolio EVM</h1>
          </div>
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="sim_portfolio_evm_rollup" disabled={!exportRows.length} />
        </div>
        <select
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value || null)}
          className="rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-sm max-w-md"
        >
          <option value="">Select practice portfolio…</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.portfolio_code} — {p.portfolio_name}
            </option>
          ))}
        </select>
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2 text-left">Practice project</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">EV</th>
                <th className="px-3 py-2 text-right">AC</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map(({ project, last }) => (
                <tr key={project.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2">
                    <Link
                      className="text-blue-400 hover:underline"
                      to={`/simulator/practice-projects/${project.id}/evm`}
                    >
                      {project.project_code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{last.period_date}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.planned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.earned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.actual_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected && rollup.length === 0 && (
            <p className="p-6 text-center text-gray-500">
              No EVM data for practice projects under this portfolio.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
