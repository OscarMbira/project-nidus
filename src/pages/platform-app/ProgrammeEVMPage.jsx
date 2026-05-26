import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listEvmSnapshots } from '../../services/evmService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function ProgrammeEVMPage() {
  const { id: programmeId } = useParams()
  const [programme, setProgramme] = useState(null)
  const [projects, setProjects] = useState([])
  const [rollup, setRollup] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data: prog } = await platformDb.from('programmes').select('programme_name, programme_code').eq('id', programmeId).single()
      setProgramme(prog)
      const { data: links } = await platformDb.from('programme_projects').select('project_id').eq('programme_id', programmeId)
      const ids = (links || []).map((l) => l.project_id).filter(Boolean)
      if (!ids.length) {
        setProjects([])
        setRollup([])
        return
      }
      const { data: projs } = await platformDb.from('projects').select('id, project_name, project_code').in('id', ids)
      setProjects(projs || [])
      const rows = []
      for (const p of projs || []) {
        const snaps = await listEvmSnapshots(p.id)
        const last = snaps[snaps.length - 1]
        if (last) rows.push({ project: p, last })
      }
      setRollup(rows)
    })()
  }, [programmeId])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/programme/${programmeId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Programme EVM roll-up</h1>
            <p className="text-sm text-gray-500">{programme?.programme_code} — {programme?.programme_name}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Last period</th>
                <th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">EV</th>
                <th className="px-3 py-2 text-right">AC</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map(({ project, last }) => (
                <tr key={project.id} className="border-t border-gray-100 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2">
                    <Link className="text-blue-400 hover:underline" to={`/platform/projects/${project.id}/evm`}>
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
          {rollup.length === 0 && <p className="p-6 text-center text-gray-500">No EVM snapshots for projects in this programme.</p>}
        </div>
      </div>
    </div>
  )
}
