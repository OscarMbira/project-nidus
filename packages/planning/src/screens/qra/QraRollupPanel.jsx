/**
 * v1355 — programme or portfolio roll-up of the latest quantitative analysis.
 * Counts of projects are clickable filters on this panel's own table (rule 64).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardStatCard from '@nidus/ui/DashboardStatCard'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'

export default function QraRollupPanel({
  db,
  linkTable,
  parentColumn,
  projectColumn,
  projectTable,
  parentIds = [],
  analysisPath,
}) {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const idsKey = parentIds.filter(Boolean).join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (!db || !ids.length) {
      setRows([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const { data: links, error: linkError } = await db.from(linkTable).select(projectColumn).in(parentColumn, ids)
      if (linkError) throw linkError
      const projectIds = [...new Set((links || []).map((row) => row[projectColumn]).filter(Boolean))]
      if (!projectIds.length) {
        if (!cancelled) setRows([])
        return
      }
      const { data: runs, error: runError } = await db.from('qra_project_latest_run').select('*').in('project_id', projectIds)
      if (runError) throw runError
      const byId = new Map((runs || []).map((run) => [run.project_id, run]))
      const missing = projectIds.filter((id) => !byId.has(id))
      let names = new Map()
      if (missing.length && projectTable) {
        const { data: projects } = await db.from(projectTable).select('id, project_name, project_code').in('id', missing)
        names = new Map((projects || []).map((project) => [project.id, project]))
      }
      const next = projectIds.map((id) => {
        const run = byId.get(id)
        const project = names.get(id)
        const summary = run?.summary || {}
        return {
          project_id: id,
          project_name: run?.project_name || project?.project_name || 'Project',
          project_code: run?.project_code || project?.project_code || '',
          created_at: run?.created_at || null,
          is_stale: run ? Boolean(run.is_stale) : true,
          hasRun: Boolean(run),
          costEmv: summary.exposure?.pre?.costEmv ?? null,
          p80: summary.cost?.p80 ?? null,
          budget: run?.budget_amount ?? null,
          chance: summary.schedule?.chance ?? null,
        }
      }).sort((a, b) => a.project_name.localeCompare(b.project_name, undefined, { sensitivity: 'base' }))
      if (!cancelled) setRows(next)
    })().catch((err) => { if (!cancelled) setError(err.message || 'Could not load the analysis roll-up.') })
    return () => { cancelled = true }
  }, [db, linkTable, parentColumn, projectColumn, projectTable, idsKey])

  const analysed = rows.filter((row) => row.hasRun)
  const stale = rows.filter((row) => !row.hasRun || row.is_stale)
  const visible = useMemo(() => {
    if (filter === 'analysed') return rows.filter((row) => row.hasRun)
    if (filter === 'stale') return rows.filter((row) => !row.hasRun || row.is_stale)
    return rows
  }, [rows, filter])

  if (!idsKey) return null
  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quantitative analysis</h2>
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DashboardStatCard label="Projects analysed" value={analysed.length} onClick={() => setFilter('analysed')} />
        <DashboardStatCard label="Stale or missing" value={stale.length} description="Older than 30 days, or never run" onClick={() => setFilter('stale')} />
        <DashboardStatCard label="Showing" value={filter === 'all' ? 'All projects' : filter === 'analysed' ? 'Analysed' : 'Stale or missing'} onClick={() => setFilter('all')} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <TableRowNumberHeader />
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-right">Expected cost</th>
              <th className="px-3 py-2 text-right">80% cost</th>
              <th className="px-3 py-2 text-right">Chance of target</th>
              <th className="px-3 py-2 text-left">Freshness</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr
                key={row.project_id}
                className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 cursor-pointer"
                onClick={() => navigate(analysisPath(row))}
              >
                <TableRowNumberCell number={index + 1} />
                <td className="px-3 py-2">{row.project_code ? `${row.project_code} · ${row.project_name}` : row.project_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.costEmv == null ? '—' : Math.round(row.costEmv).toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.p80 == null ? '—' : Math.round(row.p80).toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.chance == null ? '—' : `${Math.round(row.chance * 100)}%`}</td>
                <td className="px-3 py-2">{row.hasRun ? (row.is_stale ? 'Stale' : 'Current') : 'Not run'}</td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-700 dark:text-gray-200">No projects in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
