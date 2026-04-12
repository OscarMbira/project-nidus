import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listEvmSnapshots } from '../../services/evmService'

export default function PortfolioEVMPage() {
  const [portfolios, setPortfolios] = useState([])
  const [selected, setSelected] = useState(null)
  const [rollup, setRollup] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!u?.id) return
      const { data: ports } = await platformDb.from('portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).limit(50)
      setPortfolios(ports || [])
    })()
  }, [])

  useEffect(() => {
    if (!selected) {
      setRollup([])
      return
    }
    ;(async () => {
      const { data: progLinks } = await platformDb.from('programmes').select('id').eq('portfolio_id', selected).eq('is_deleted', false)
      const progIds = (progLinks || []).map((p) => p.id)
      if (!progIds.length) {
        setRollup([])
        return
      }
      const { data: pp } = await platformDb.from('programme_projects').select('project_id').in('programme_id', progIds)
      const projectIds = [...new Set((pp || []).map((x) => x.project_id).filter(Boolean))]
      if (!projectIds.length) {
        setRollup([])
        return
      }
      const { data: projs } = await platformDb.from('projects').select('id, project_name, project_code').in('id', projectIds)
      const rows = []
      for (const p of projs || []) {
        const snaps = await listEvmSnapshots(p.id)
        const last = snaps[snaps.length - 1]
        if (last) rows.push({ project: p, last })
      }
      setRollup(rows)
    })()
  }, [selected])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/platform/portfolio" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Portfolio EVM</h1>
        </div>
        <select value={selected || ''} onChange={(e) => setSelected(e.target.value || null)} className="rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-sm max-w-md">
          <option value="">Select portfolio…</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>{p.portfolio_code} — {p.portfolio_name}</option>
          ))}
        </select>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">EV</th>
                <th className="px-3 py-2 text-right">AC</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map(({ project, last }) => (
                <tr key={project.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">
                    <Link className="text-blue-400 hover:underline" to={`/platform/projects/${project.id}/evm`}>{project.project_code}</Link>
                  </td>
                  <td className="px-3 py-2">{last.period_date}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.planned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.earned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{last.actual_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected && rollup.length === 0 && <p className="p-6 text-center text-gray-500">No EVM data for projects under this portfolio.</p>}
        </div>
      </div>
    </div>
  )
}
