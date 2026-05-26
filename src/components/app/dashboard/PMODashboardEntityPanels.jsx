/**
 * PMO Dashboard — Portfolio / Programmes / Projects tab panels (data from DB via existing services).
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Plus } from 'lucide-react'
import { getPortfolios } from '../../../services/portfolioService'
import { getProgrammesForList } from '../../../services/programmeService'
import { getAllProjects } from '../../../services/projectService'
import { platformProjectPath } from '../../../utils/projectRouteParam'
import ExportListMenu from '../../ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const DEBOUNCE_MS = 300

function useDebouncedValue(value, ms = DEBOUNCE_MS) {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return out
}

function sortRows(rows, sort) {
  if (!sort?.column || !sort?.direction) return rows
  const { column, direction } = sort
  const mult = direction === 'desc' ? -1 : 1
  const numeric = column === 'percentage_complete'
  return [...rows].sort((a, b) => {
    if (numeric) {
      const av = Number(a[column]) || 0
      const bv = Number(b[column]) || 0
      if (av < bv) return -1 * mult
      if (av > bv) return 1 * mult
      return 0
    }
    const av = a[column] ?? ''
    const bv = b[column] ?? ''
    if (av < bv) return -1 * mult
    if (av > bv) return 1 * mult
    return 0
  })
}

function SortBtn({ label, column, sort, onSort }) {
  const dir = sort.column === column ? sort.direction : null
  const icon = dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅'
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 text-left font-medium text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
    >
      {label} <span className="text-xs text-gray-500">{icon}</span>
    </button>
  )
}

function cycleSort(column, prev) {
  if (prev.column !== column) return { column, direction: 'asc' }
  if (prev.direction === 'asc') return { column, direction: 'desc' }
  return { column: null, direction: null }
}

export function DashboardPortfolioPanel({ organizationId: _organizationId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [sort, setSort] = useState({ column: 'portfolio_name', direction: 'asc' })
  const loadGen = useRef(0)

  const load = useCallback(async () => {
    const gen = ++loadGen.current
    setLoading(true)
    try {
      const data = await getPortfolios({ search: search.trim() || undefined })
      if (gen !== loadGen.current) return
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      if (gen === loadGen.current) setRows([])
    } finally {
      if (gen === loadGen.current) setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort])
  const exportData = useMemo(
    () =>
      sorted.map((p) => ({
        portfolio_name: p.portfolio_name || '',
        portfolio_code: p.portfolio_code || '',
        portfolio_status: p.portfolio_status || '',
        portfolio_type: p.portfolio_type || '',
      })),
    [sorted]
  )

  const onSort = (column) => setSort((s) => cycleSort(column, s))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Portfolios for your organisation. Open a record to view or edit details.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportListMenu
            columns={[
              { key: 'portfolio_name', label: 'Name' },
              { key: 'portfolio_code', label: 'Code' },
              { key: 'portfolio_status', label: 'Status' },
              { key: 'portfolio_type', label: 'Type' },
            ]}
            data={exportData}
            baseFilename="PMO-Dashboard-Portfolios"
            disabled={exportData.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate('/platform/portfolio/create')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <Plus className="h-4 w-4" /> New portfolio
          </button>
          <button
            type="button"
            onClick={() => navigate('/platform/portfolio')}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full portfolio module <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search portfolios..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Search portfolios"
        />
      </div>
      <div className="bg-white/95 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading portfolios…</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-500">No portfolios found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100/90 dark:bg-gray-900/50">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="text-left p-3">
                    <SortBtn label="Name" column="portfolio_name" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Code" column="portfolio_code" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Status" column="portfolio_status" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Type" column="portfolio_type" sort={sort} onSort={onSort} />
                  </th>
                  <th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/30">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="p-3 text-gray-900 dark:text-gray-200">{p.portfolio_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.portfolio_code || '—'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{p.portfolio_status || '—'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.portfolio_type || '—'}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/platform/portfolio/edit/${p.id}`, { state: { viewOnly: true } })
                        }
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardProgrammesPanel({ organizationId: _organizationId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [sort, setSort] = useState({ column: 'programme_name', direction: 'asc' })
  const loadGen = useRef(0)

  const load = useCallback(async () => {
    const gen = ++loadGen.current
    setLoading(true)
    try {
      const data = await getProgrammesForList({ search: search.trim() || undefined })
      if (gen !== loadGen.current) return
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      if (gen === loadGen.current) setRows([])
    } finally {
      if (gen === loadGen.current) setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort])
  const exportData = useMemo(
    () =>
      sorted.map((p) => ({
        programme_name: p.programme_name || '',
        programme_code: p.programme_code || '',
        programme_status: p.programme_status || '',
        programme_type: p.programme_type || '',
      })),
    [sorted]
  )

  const onSort = (column) => setSort((s) => cycleSort(column, s))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">Programmes linked to your access. Open for details.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportListMenu
            columns={[
              { key: 'programme_name', label: 'Name' },
              { key: 'programme_code', label: 'Code' },
              { key: 'programme_status', label: 'Status' },
              { key: 'programme_type', label: 'Type' },
            ]}
            data={exportData}
            baseFilename="PMO-Dashboard-Programmes"
            disabled={exportData.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate('/platform/programme/create')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <Plus className="h-4 w-4" /> New programme
          </button>
          <button
            type="button"
            onClick={() => navigate('/platform/programme')}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full programme module <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search programmes..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Search programmes"
        />
      </div>
      <div className="bg-white/95 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading programmes…</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-500">No programmes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100/90 dark:bg-gray-900/50">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="text-left p-3">
                    <SortBtn label="Name" column="programme_name" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Code" column="programme_code" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Status" column="programme_status" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Type" column="programme_type" sort={sort} onSort={onSort} />
                  </th>
                  <th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/30">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="p-3 text-gray-900 dark:text-gray-200">{p.programme_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.programme_code || '—'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{p.programme_status || '—'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.programme_type || '—'}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/platform/programme/${p.id}`)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardProjectsPanel({ organizationId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [sort, setSort] = useState({ column: 'project_name', direction: 'asc' })
  const loadGen = useRef(0)

  const load = useCallback(async () => {
    if (!organizationId) {
      setRows([])
      setLoading(false)
      return
    }
    const gen = ++loadGen.current
    setLoading(true)
    try {
      const res = await getAllProjects(organizationId, {
        search: search.trim() || undefined,
      })
      if (gen !== loadGen.current) return
      const data = res?.success ? res.data : []
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      if (gen === loadGen.current) setRows([])
    } finally {
      if (gen === loadGen.current) setLoading(false)
    }
  }, [organizationId, search])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => {
    const withStatus = rows.map((r) => ({
      ...r,
      status_name: r.project_statuses?.status_name ?? '',
    }))
    return sortRows(withStatus, sort)
  }, [rows, sort])

  const exportData = useMemo(
    () =>
      sorted.map((p) => ({
        project_name: p.project_name || '',
        project_code: p.project_code || '',
        status_name: p.status_name || '',
        percentage_complete: p.percentage_complete ?? '',
      })),
    [sorted]
  )

  const onSort = (column) => setSort((s) => cycleSort(column, s))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">All projects for this organisation (same scope as Projects → All).</p>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportListMenu
            columns={[
              { key: 'project_name', label: 'Project Name' },
              { key: 'project_code', label: 'Code' },
              { key: 'status_name', label: 'Status' },
              { key: 'percentage_complete', label: '% Complete' },
            ]}
            data={exportData}
            baseFilename="PMO-Dashboard-Projects"
            disabled={exportData.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate('/platform/projects/create')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <Plus className="h-4 w-4" /> New project
          </button>
          <button
            type="button"
            onClick={() => navigate('/platform/projects')}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full projects list <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Search projects"
        />
      </div>
      <div className="bg-white/95 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading projects…</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-500">No projects found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-100/90 dark:bg-gray-900/50">
                <TableRowNumberHeader className="!normal-case" />
                  <th className="text-left p-3">
                    <SortBtn label="Name" column="project_name" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Code" column="project_code" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-left p-3">
                    <SortBtn label="Status" column="status_name" sort={sort} onSort={onSort} />
                  </th>
                  <th className="text-right p-3">
                    <SortBtn label="% Complete" column="percentage_complete" sort={sort} onSort={onSort} />
                  </th>
                  <th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/30">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="p-3 text-gray-900 dark:text-gray-200">{p.project_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.project_code || '—'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{p.status_name || '—'}</td>
                    <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                      {p.percentage_complete != null ? `${p.percentage_complete}%` : '—'}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => navigate(platformProjectPath(p.id))}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
