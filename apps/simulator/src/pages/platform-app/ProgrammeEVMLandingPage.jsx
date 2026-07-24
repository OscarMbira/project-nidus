import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { listEvmSnapshots } from '../../services/evmService'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

/** PMO org-wide programme EVM roll-up (selector + project drill-down). */
export default function ProgrammeEVMLandingPage() {
  const [programmes, setProgrammes] = useState([])
  const [selected, setSelected] = useState(null)
  const [rollup, setRollup] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data: progs } = await platformDb
        .from('programmes')
        .select('id, programme_name, programme_code')
        .eq('is_deleted', false)
        .order('programme_name')
        .limit(100)
      setProgrammes(progs || [])
    })()
  }, [])

  useEffect(() => {
    if (!selected) {
      setRollup([])
      return
    }
    ;(async () => {
      const { data: links } = await platformDb
        .from('programme_projects')
        .select('project_id')
        .eq('programme_id', selected)
      const projectIds = [...new Set((links || []).map((l) => l.project_id).filter(Boolean))]
      if (!projectIds.length) {
        setRollup([])
        return
      }
      const { data: projs } = await platformDb
        .from('projects')
        .select('id, project_name, project_code')
        .in('id', projectIds)
      const rows = []
      for (const p of projs || []) {
        const snaps = await listEvmSnapshots(p.id)
        const last = snaps[snaps.length - 1]
        if (last) rows.push({ project: p, last })
      }
      setRollup(rows)
    })()
  }, [selected])

  const selectedProgramme = programmes.find((p) => p.id === selected)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/platform/programme" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Programme EVM</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Roll up earned-value metrics for projects within a programme. Select a programme to view project-level EVM
          snapshots.
        </p>
        <select
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value || null)}
          className="rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-sm max-w-md"
        >
          <option value="">Select programme…</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.programme_code} — {p.programme_name}
            </option>
          ))}
        </select>
        {selectedProgramme && (
          <Link
            to={`/platform/programme/${selectedProgramme.id}/evm`}
            className="text-sm text-blue-400 hover:underline inline-block"
          >
            Open detailed view for {selectedProgramme.programme_code}
          </Link>
        )}
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
            <p className="p-6 text-center text-gray-500">No EVM data for projects in this programme.</p>
          )}
        </div>
      </div>
    </div>
  )
}
