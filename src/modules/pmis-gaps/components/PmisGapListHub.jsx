import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Search, Table2 } from 'lucide-react'
import ExportListMenu from '../../../components/ui/ExportListMenu'

const SORT_CYCLE = ['none', 'asc', 'desc']

function nextSortDir(current) {
  const i = SORT_CYCLE.indexOf(current)
  return SORT_CYCLE[(i + 1) % SORT_CYCLE.length]
}

function sortIndicator(dir) {
  if (dir === 'asc') return '↑'
  if (dir === 'desc') return '↓'
  return '⇅'
}

function sortRows(rows, key, dir) {
  if (!key || dir === 'none') return rows
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1 * mul
    if (bv == null) return -1 * mul
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
    return String(av).localeCompare(String(bv)) * mul
  })
}

/**
 * Reusable PMIS gap list hub — search, sort, card/table toggle, export.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {import('lucide-react').LucideIcon} [props.icon]
 * @param {string} props.storageKey — localStorage key for view preference
 * @param {{ key: string, label: string }[]} props.columns
 * @param {() => Promise<object[]>} props.loadRows
 * @param {string} [props.baseFilename]
 * @param {React.ReactNode} [props.headerActions]
 * @param {(row: object) => React.ReactNode} [props.renderCard]
 * @param {(row: object) => React.ReactNode} [props.renderRowActions]
 */
export default function PmisGapListHub({
  title,
  description,
  icon: Icon,
  storageKey,
  columns,
  loadRows,
  baseFilename = 'export',
  headerActions = null,
  renderCard = null,
  renderRowActions = null,
}) {
  const viewKey = `${storageKey}-view-v1`
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('none')
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(viewKey) || 'table'
    } catch {
      return 'table'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(viewKey, view)
    } catch {
      /* ignore */
    }
  }, [view, viewKey])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadRows()
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Failed to load records')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [loadRows])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows
    if (q) {
      list = list.filter((row) =>
        columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
      )
    }
    return sortRows(list, sortKey, sortDir)
  }, [rows, search, sortKey, sortDir, columns])

  const exportData = useMemo(
    () =>
      filtered.map((row) => {
        const out = {}
        for (const col of columns) out[col.key] = row[col.key] ?? ''
        return out
      }),
    [filtered, columns]
  )

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(nextSortDir(sortDir))
      if (sortDir === 'desc') setSortKey('')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {Icon && <Icon className="h-8 w-8 text-blue-400" />}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportListMenu
                columns={columns}
                data={exportData}
                baseFilename={baseFilename}
                disabled={!exportData.length}
              />
              {headerActions}
            </div>
          </div>
          {description && (
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search records"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('card')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                view === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              aria-pressed={view === 'card'}
            >
              <LayoutGrid className="h-4 w-4" /> Card
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                view === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              aria-pressed={view === 'table'}
            >
              <Table2 className="h-4 w-4" /> Table
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No records found.
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}{' '}
                      <span className="text-gray-400">
                        {sortKey === col.key ? sortIndicator(sortDir) : '⇅'}
                      </span>
                    </th>
                  ))}
                  {renderRowActions && <th scope="col" className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((row) => (
                  <tr key={row.id || JSON.stringify(row)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {String(row[col.key] ?? '—')}
                      </td>
                    ))}
                    {renderRowActions && (
                      <td className="px-4 py-3 text-sm">{renderRowActions(row)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <div
                key={row.id || JSON.stringify(row)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                {renderCard ? (
                  renderCard(row)
                ) : (
                  columns.map((col) => (
                    <div key={col.key} className="mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{col.label}: </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {String(row[col.key] ?? '—')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
