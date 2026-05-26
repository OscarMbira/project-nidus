import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useViewMode } from '../../hooks/useViewMode'
import ExportListMenu from '../ui/ExportListMenu'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

import RowNumberBadge from '../ui/RowNumberBadge'
const SORT_KEYS = ['test_case_code', 'title', 'module', 'test_type', 'priority', 'status', 'updated_at']

function sortInd(key, sk, sd) {
  if (sk !== key || !sd) return <ArrowUpDown className="w-3.5 h-3.5 inline opacity-40" aria-hidden />
  return sd === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 inline text-blue-500" aria-hidden />
    : <ArrowDown className="w-3.5 h-3.5 inline text-blue-500" aria-hidden />
}

function cycle(key, sk, sd, setS) {
  if (sk !== key) return setS({ key, dir: 'asc' })
  if (sd === 'asc') return setS({ key, dir: 'desc' })
  if (sd === 'desc') return setS({ key: null, dir: null })
  return setS({ key, dir: 'asc' })
}

export default function TestCaseListCore({ mode = 'platform', pathPrefix, viewKey = 'tc-cases' }) {
  const svc = mode === 'sim' ? sim : platform
  const [viewMode, setViewMode] = useViewMode(viewKey, 'list')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sk, setSk] = useState(null)
  const [sd, setSd] = useState(null)
  const setSort = useCallback((n) => { setSk(n.key); setSd(n.dir) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await svc.listTestCases({ search })
    if (res.success) setItems(res.data || [])
    setLoading(false)
  }, [svc, search])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let rows = items
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      rows = rows.filter((r) => (r.title || '').toLowerCase().includes(s) || (r.test_case_code || '').toLowerCase().includes(s))
    }
    if (!sk || !sd) return rows
    const m = sd === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = sk === 'module' ? a.module?.name : a[sk]
      const bv = sk === 'module' ? b.module?.name : b[sk]
      if (sk === 'updated_at') return (new Date(av).getTime() - new Date(bv).getTime()) * m
      return String(av || '').localeCompare(String(bv || ''), undefined, { sensitivity: 'base' }) * m
    })
  }, [items, search, sk, sd])

  const exportData = useMemo(() => filtered.map((r, index) => ({
    test_case_code: r.test_case_code,
    title: r.title,
    module: r.module?.name || r.module?.code || '',
    test_type: r.test_type,
    priority: r.priority,
    status: r.status,
    updated_at: r.updated_at,
  })), [filtered])

  return (
    <div className="p-4 max-w-7xl mx-auto text-gray-900 dark:text-gray-100 min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-semibold">Test case library</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button type="button" onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : ''}`} aria-label="Grid"><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : ''}`} aria-label="List"><List className="w-4 h-4" /></button>
          </div>
          <ExportListMenu
            columns={[
              { key: 'test_case_code', header: 'Code' },
              { key: 'title', header: 'Title' },
              { key: 'module', header: 'Module' },
              { key: 'test_type', header: 'Type' },
              { key: 'priority', header: 'Priority' },
              { key: 'status', header: 'Status' },
              { key: 'updated_at', header: 'Updated' },
            ]}
            data={exportData}
            baseFilename="test_cases"
          />
          <Link to={`${pathPrefix}/cases/new`} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">New</Link>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 flex-1 max-w-md bg-white dark:bg-gray-900">
          <Search className="w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, title" className="w-full py-1.5 bg-transparent outline-none text-sm" />
        </div>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && viewMode === 'list' && (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-white dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800">
                <TableRowNumberHeader className="!normal-case" />
                {['test_case_code', 'title', 'module', 'test_type', 'priority', 'status', 'updated_at'].map((k) => (
                  <th key={k} className="text-left p-2">
                    <button type="button" onClick={() => cycle(k, sk, sd, setSort)} className="inline-flex items-center gap-1">
                      {k}
                      {sortInd(k, sk, sd)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-2 font-mono text-xs">
                    <Link to={`${pathPrefix}/cases/${r.id}`} className="text-blue-500 hover:underline">{r.test_case_code}</Link>
                  </td>
                  <td className="p-2 max-w-md truncate">{r.title}</td>
                  <td className="p-2">{r.module?.code}</td>
                  <td className="p-2">{r.test_type}</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2 text-xs text-gray-500">{r.updated_at && String(r.updated_at).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewMode === 'grid' && !loading && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r, index) => (
            <li key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900/80">
              <div className="flex items-start gap-2 mb-1">
                <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <div className="min-w-0">
              <div className="text-xs text-blue-500 font-mono mb-1">{r.test_case_code}</div>
              <Link to={`${pathPrefix}/cases/${r.id}`} className="font-medium hover:underline block mb-1">{r.title}</Link>
              <div className="text-xs text-gray-500">{r.status} · {r.priority}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
