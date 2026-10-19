/**
 * v1272 — Highlight report layouts (PRD D12a, stories 27a–27c): list page.
 * Organisation (PMO) layouts and project layouts from the template library ('report_layout'
 * domain). Shared by Platform and Simulator; editor is a routed page (rule 65).
 *
 * Props: basePath of this page's routes, e.g. '/platform/pmo/report-layouts'.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, LayoutTemplate, Pencil, Plus } from 'lucide-react'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { sortRowsByColumn } from '@nidus/shared/hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../Table.jsx'

const TIER_LABEL = { pmo: 'Organisation', project: 'Project' }

export default function ReportLayoutsPage({ basePath }) {
  const { db } = useAppConfig()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [projects, setProjects] = useState({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ column: null, direction: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      db.rpc('ai_list_report_layouts'),
      db.from('ai_v_projects').select('id, project_name').limit(500),
    ]).then(([list, projs]) => {
      if (list.error) setError('Layouts could not be loaded.')
      setRows(list.data || [])
      setProjects(Object.fromEntries((projs.data || []).map((p) => [p.id, p.project_name])))
      setLoading(false)
    })
  }, [db])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = rows
      .map((r) => ({ ...r, tierLabel: TIER_LABEL[r.tier] || r.tier, projectName: r.project_id ? projects[r.project_id] || '' : '', sections: (r.layout?.sections || []).filter((s) => s.enabled !== false).length }))
      .filter((r) => !q || `${r.name} ${r.projectName}`.toLowerCase().includes(q))
    return sortRowsByColumn(filtered, sort.column, sort.direction, {
      name: (r) => r.name, tierLabel: (r) => r.tierLabel, projectName: (r) => r.projectName, status: (r) => r.status, sections: (r) => r.sections,
    }, { column: 'name', direction: 'asc' })
  }, [rows, projects, search, sort])

  const cycle = (column) => setSort((s) => (s.column !== column ? { column, direction: 'asc' } : s.direction === 'asc' ? { column, direction: 'desc' } : { column: null, direction: null }))
  const header = (key, label) => (
    <th scope="col" onClick={() => cycle(key)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && cycle(key)}
      aria-sort={sort.column === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
      {label} <span aria-hidden="true">{sort.column === key ? (sort.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
    </th>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            <LayoutTemplate className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" /> Highlight report layouts
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose the sections and fields your highlight reports contain. "Draft with AI" fills exactly these sections.</p>
        </div>
        <button type="button" onClick={() => navigate(`${basePath}/new`)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New layout
        </button>
      </div>

      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search layouts…" aria-label="Search layouts"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-80" />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <TableRowNumberHeader />
              {header('name', 'Name')}
              {header('tierLabel', 'Applies to')}
              {header('projectName', 'Project')}
              {header('sections', 'Sections')}
              {header('status', 'Status')}
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</td></tr>}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No layouts yet — reports use the standard layout until you create one.</td></tr>
            )}
            {visible.map((r, i) => (
              <tr key={r.node_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableRowNumberCell number={getDisplayRowNumber(i)} />
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <Link to={`${basePath}/${r.node_id}`} className="text-blue-600 hover:underline dark:text-blue-400">{r.name}</Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.tierLabel}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.projectName || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.sections}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.status === 'published' ? 'Published' : 'Draft'}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => navigate(`${basePath}/${r.node_id}`)} title={r.can_edit ? 'Edit layout' : 'View layout'} aria-label={r.can_edit ? 'Edit layout' : 'View layout'}
                    className={`rounded p-1.5 ${r.can_edit ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                    {r.can_edit ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
