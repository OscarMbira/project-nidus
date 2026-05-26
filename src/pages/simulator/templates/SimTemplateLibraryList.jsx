import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Eye, Plus } from 'lucide-react'
import { getTemplatesForAccount } from '../../../services/sim/simTemplateLibraryService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import ViewToggle from '../../../components/ui/ViewToggle'
import { useViewMode } from '../../../hooks/useViewMode'
import { useSortableTable } from '../../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'
import { TEMPLATE_TYPE_OPTIONS } from '../../../services/templateLibraryConstants'

const BASE = '/simulator/templates'
const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'template_type_code', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

export default function TemplateLibraryList() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-template-library-list', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-template-lib-list-sort',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready || !accountId) {
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await getTemplatesForAccount(accountId, {
        manage: false,
        search: debounced,
        typeCode: typeFilter,
      })
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
  }, [ready, accountId, debounced, typeFilter])

  const accessors = useMemo(
    () => ({
      title: (r) => r.title ?? '',
      template_type_code: (r) => r.template_type_code ?? '',
      status: (r) => r.status ?? '',
      version: (r) => r.version ?? '',
      updated_at: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : ''),
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(rows, accessors), [rows, sortedData, accessors])
  const exportRows = useMemo(() => displayRows.map((r, index) => ({ ...r, updated_at: accessors.updated_at(r) })), [displayRows, accessors])

  if (!ready) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }
  if (!accountId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>No organisation context. Join or create a project to browse templates.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Library</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Published master templates for your organisation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Template_Library" disabled={!exportRows.length} />
          <Link
            to={`${BASE}/notifications`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-200 text-sm min-h-[44px]"
          >
            Notifications
          </Link>
          <Link
            to={`${BASE}/project-copies`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
          >
            My project templates
          </Link>
          <Link
            to={`${BASE}/manage`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
          >
            Manage
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, tags…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-h-[44px]"
        >
          <option value="">All types</option>
          {TEMPLATE_TYPE_OPTIONS.map((t, index) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Template library layout" />
      </div>

      {err && <p className="text-red-600 dark:text-red-400 mb-4">{err}</p>}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRows.map((r, index) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <button
                type="button"
                onClick={() => navigate(`${BASE}/${r.id}`)}
                className="text-left font-semibold text-gray-900 dark:text-white hover:underline"
              >
                {r.title}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {r.template_type_code} · {r.status} · v{r.version}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`${BASE}/${r.id}`)}
                  className="text-sm text-violet-600 dark:text-violet-400 inline-flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" /> View
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`${BASE}/copies/new?templateId=${r.id}`)}
                  className="text-sm text-gray-700 dark:text-gray-300 inline-flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Project copy
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')}>
                  Title
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('template_type_code')}
                  onSort={() => handleSort('template_type_code')}
                >
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('version')} onSort={() => handleSort('version')}>
                  Version
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('updated_at')}
                  onSort={() => handleSort('updated_at')}
                >
                  Updated
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-white">{r.title}</TableCell>
                  <TableCell>{r.template_type_code}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.version}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-violet-600 dark:text-violet-400 text-sm" onClick={() => navigate(`${BASE}/${r.id}`)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="text-gray-700 dark:text-gray-300 text-sm"
                      onClick={() => navigate(`${BASE}/copies/new?templateId=${r.id}`)}
                    >
                      Copy
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && displayRows.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400 mt-6">No published templates yet. PMO can publish templates under Manage.</p>
      )}
    </div>
  )
}
