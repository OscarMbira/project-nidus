/**
 * v1341 (D3) — "Projects by industry" on the PMO and Portfolio dashboards. Outside a project the
 * sidebar shows core items only; this filter gives the organisation-wide industry view instead.
 * Industry options come from the organisation's selected industries (database). A composite
 * project appears under each of its industries.
 *
 * @param {{ accountId: string|null, projectHref?: (project) => string, title?: string }} props
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory } from 'lucide-react'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { groupProjectsByIndustry, loadOrganisationIndustryProjects } from '@nidus/shared/utils/industryDashboardFilter'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table.jsx'

const ACCESSORS = {
  project_code: (p) => p.project_code,
  project_name: (p) => p.project_name,
  industries: (p) => p._industries,
}

export default function IndustryProjectsFilter({ accountId, projectHref = null, title = 'Projects by industry' }) {
  const [data, setData] = useState({ industries: [], projects: [], projectIndustries: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [industryId, setIndustryId] = useState('')
  const [search, setSearch] = useState('')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'project_name', direction: 'asc' },
    storageKey: 'dashboard-industry-projects-sort',
  })

  useEffect(() => {
    let cancelled = false
    if (!accountId) return undefined
    setLoading(true)
    loadOrganisationIndustryProjects(accountId)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load projects by industry') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accountId])

  const grouped = useMemo(
    () => groupProjectsByIndustry(data.projects, data.projectIndustries, data.industries),
    [data],
  )
  const nameById = useMemo(() => new Map(data.industries.map((i) => [i.id, i.name])), [data.industries])

  const rows = useMemo(() => {
    const industriesOf = new Map()
    for (const [indId, ids] of grouped.byIndustry) {
      for (const pid of ids) {
        if (!industriesOf.has(pid)) industriesOf.set(pid, [])
        industriesOf.get(pid).push(nameById.get(indId))
      }
    }
    const allowed = industryId ? new Set(grouped.byIndustry.get(industryId) || []) : null
    const q = search.trim().toLowerCase()
    const list = data.projects
      .filter((p) => !allowed || allowed.has(p.id))
      .map((p) => ({ ...p, _industries: (industriesOf.get(p.id) || []).join(', ') }))
      .filter((p) => !q || `${p.project_code || ''} ${p.project_name || ''} ${p._industries}`.toLowerCase().includes(q))
    return sortedData(list, ACCESSORS)
  }, [data.projects, grouped, industryId, nameById, search, sortedData])

  if (!accountId || (!loading && data.industries.length === 0)) return null

  const header = (column, label) => (
    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn(column)} onSort={() => handleSort(column)}>{label}</TableHeaderCell>
  )

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 space-y-4" aria-labelledby="industry-projects-heading">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 id="industry-projects-heading" className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Factory className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" /> {title}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
          <label htmlFor="dashboard-industry-filter" className="sr-only">Industry</label>
          <select
            id="dashboard-industry-filter"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All industries</option>
            {grouped.counts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
          </select>
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Projects per industry">
        {grouped.counts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setIndustryId(industryId === c.id ? '' : c.id)}
            aria-pressed={industryId === c.id}
            className={`rounded-full border px-3 py-1 text-xs ${industryId === c.id
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >
            {c.name}: {c.count}
          </button>
        ))}
        {grouped.untagged.length > 0 && (
          <span className="rounded-full border border-dashed border-gray-300 dark:border-gray-600 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
            No industry: {grouped.untagged.length}
          </span>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading projects…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No projects match.</p>}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <TableRowNumberHeader />
                {header('project_code', 'Code')}
                {header('project_name', 'Project')}
                {header('industries', 'Industries')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <TableRowNumberCell number={getDisplayRowNumber(i)} />
                  <td className="px-6 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">{p.project_code || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {projectHref ? <Link to={projectHref(p)} className="hover:underline">{p.project_name}</Link> : p.project_name}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{p._industries || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
