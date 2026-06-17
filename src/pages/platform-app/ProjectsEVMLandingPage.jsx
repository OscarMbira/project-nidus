import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listEvmSnapshots } from '../../services/evmService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

/** PMO org-wide project EVM listing (latest snapshot per project). */
export default function ProjectsEVMLandingPage() {
  const [rollup, setRollup] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const { data: projs } = await platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_code')
          .limit(200)
        const rows = []
        for (const p of projs || []) {
          const snaps = await listEvmSnapshots(p.id)
          const last = snaps[snaps.length - 1]
          if (last) rows.push({ project: p, last })
        }
        setRollup(rows)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/platform/projects" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Project EVM</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Latest earned-value snapshot for each project with EVM data. Open a project for full history and editing.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">EV</th>
                <th className="px-3 py-2 text-right">AC</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map(({ project, last }, index) => (
                <tr key={project.id} className="border-t border-gray-100 dark:border-gray-800">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2">
                    <Link className="text-blue-400 hover:underline" to={`/platform/projects/${project.id}/evm`}>
                      {project.project_code} — {project.project_name}
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
          {!loading && rollup.length === 0 && (
            <p className="p-6 text-center text-gray-500">No project EVM snapshots recorded yet.</p>
          )}
          {loading && <p className="p-6 text-center text-gray-500">Loading project EVM data…</p>}
        </div>
      </div>
    </div>
  )
}
