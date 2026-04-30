import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useViewMode } from '../../hooks/useViewMode'
import ExportListMenu from '../ui/ExportListMenu'
import * as platformSvc from '../../services/workAuthorisationService'
import * as simSvc from '../../services/simWorkAuthorisationService'

const SORT_KEYS = ['reference_code', 'title', 'action_type', 'status', 'updated_at']

function sortIndicator(key, sortKey, sortDir) {
  if (sortKey !== key || !sortDir) return <ArrowUpDown className="w-3.5 h-3.5 inline opacity-40" aria-hidden />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 inline text-blue-500" aria-hidden />
    : <ArrowDown className="w-3.5 h-3.5 inline text-blue-500" aria-hidden />
}

function cycleSort(key, sortKey, sortDir, setSort) {
  if (sortKey !== key) {
    setSort({ key, dir: 'asc' })
    return
  }
  if (sortDir === 'asc') setSort({ key, dir: 'desc' })
  else if (sortDir === 'desc') setSort({ key: null, dir: null })
  else setSort({ key, dir: 'asc' })
}

export default function WorkAuthorisationListCore({ mode = 'platform' }) {
  const svc = mode === 'sim' ? simSvc : platformSvc
  const basePath = mode === 'sim'
    ? '/simulator/pm/controls/work-authorisations'
    : '/platform/work-authorisations'
  const pageId = mode === 'sim' ? 'sim-work-authorisations' : 'platform-work-authorisations'

  const [viewMode, setViewMode] = useViewMode(pageId, 'list')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState(null)

  const setSort = useCallback((next) => {
    setSortKey(next.key)
    setSortDir(next.dir)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await svc.listWorkAuthorisations({})
    if (res.success) setItems(res.data || [])
    setLoading(false)
  }, [svc])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let rows = items
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      rows = rows.filter((r) =>
        (r.title || '').toLowerCase().includes(s) ||
        (r.reference_code || '').toLowerCase().includes(s) ||
        (r.action_type || '').toLowerCase().includes(s)
      )
    }
    if (!sortKey || !sortDir) return rows
    const mult = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      if (sortKey === 'updated_at') {
        return (new Date(va).getTime() - new Date(vb).getTime()) * mult
      }
      return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * mult
    })
  }, [items, search, sortKey, sortDir])

  const exportColumns = useMemo(() => [
    { key: 'reference_code', header: 'Reference' },
    { key: 'title', header: 'Title' },
    { key: 'action_type', header: 'Action type' },
    { key: 'status', header: 'Status' },
    { key: 'updated_at', header: 'Updated' },
    ...(mode === 'platform'
      ? [{ key: 'project_name', header: 'Project' }]
      : [{ key: 'practice_name', header: 'Practice project' }]),
  ], [mode])

  const exportData = useMemo(() => filtered.map((r) => ({
    reference_code: r.reference_code,
    title: r.title,
    action_type: r.action_type,
    status: r.status,
    updated_at: r.updated_at,
    project_name: mode === 'platform' ? (r.project?.project_name || '') : '',
    practice_name: mode === 'sim' ? (r.practice_project?.project_name || '') : '',
  })), [filtered, mode])

  const projectLabel = (r) => {
    if (mode === 'platform') return r.project?.project_name || '—'
    return r.practice_project?.project_name || '—'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Work authorisations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Governed approvals for lifecycle actions{mode === 'sim' ? ' (practice)' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`${basePath}/drafts`}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Draft queue
          </Link>
          <Link
            to={`${basePath}/new`}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            New request
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search reference, title, action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={exportColumns}
            data={exportData}
            baseFilename={`work-authorisations-${mode}`}
            disabled={loading}
          />
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4 inline mr-1" /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="w-4 h-4 inline mr-1" /> Cards
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No records match your criteria.</p>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                {[
                  ['reference_code', 'Reference'],
                  ['title', 'Title'],
                  ['action_type', 'Action'],
                  [mode === 'platform' ? 'project' : 'practice', mode === 'platform' ? 'Project' : 'Practice'],
                  ['status', 'Status'],
                  ['updated_at', 'Updated'],
                ].map(([k, label]) => (
                  <th key={k} className="text-left px-3 py-2 font-medium">
                    {['project', 'practice'].includes(k) ? (
                      <span>{label}</span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => cycleSort(k, sortKey, sortDir, setSort)}
                      >
                        {label}
                        {sortIndicator(k, sortKey, sortDir)}
                      </button>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 font-mono text-xs">{r.reference_code}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{r.title}</td>
                  <td className="px-3 py-2">{r.action_type}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate">{projectLabel(r)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`${basePath}/${r.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm flex flex-col gap-2"
            >
              <div className="flex justify-between gap-2">
                <span className="font-mono text-xs text-gray-500">{r.reference_code}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{r.status}</span>
              </div>
              <h3 className="font-medium line-clamp-2">{r.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{projectLabel(r)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-auto">{r.action_type}</p>
              <Link
                to={`${basePath}/${r.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline pt-2"
              >
                View details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
