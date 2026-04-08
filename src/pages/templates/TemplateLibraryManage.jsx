import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Eye } from 'lucide-react'
import { getTemplatesForAccount } from '../../services/templateLibraryService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table'

const BASE = '/platform/templates'
const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'template_type_code', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

export default function TemplateLibraryManage() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-template-lib-manage', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-template-manage-sort',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
    })()
  }, [])

  useEffect(() => {
    if (!accountId) {
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      const { data, error } = await getTemplatesForAccount(accountId, { manage: true, search: debounced })
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
  }, [accountId, debounced])

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
  const exportRows = useMemo(() => displayRows.map((r) => ({ ...r, updated_at: accessors.updated_at(r) })), [displayRows, accessors])

  if (!accountId && !loading) {
    return <div className="p-8 text-center text-gray-600 dark:text-gray-400">No organisation context.</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">PMO: all statuses including drafts and archived.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Template_Library_Manage" disabled={!exportRows.length} />
          <Link to={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm min-h-[44px]">
            <Plus className="h-5 w-5" /> New template
          </Link>
        </div>
      </div>
      <div className="mb-4 flex gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-h-[44px]"
        />
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Manage layout" />
      </div>
      {err && <p className="text-red-600 dark:text-red-400 mb-4">{err}</p>}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {displayRows.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              <p className="font-semibold text-gray-900 dark:text-white">{r.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {r.status} · {r.template_type_code}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => navigate(`${BASE}/${r.id}`)} className="text-sm text-violet-600 inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" /> View
                </button>
                <button type="button" onClick={() => navigate(`${BASE}/${r.id}/edit`)} className="text-sm inline-flex items-center gap-1">
                  <Pencil className="h-4 w-4" /> Edit
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
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('template_type_code')} onSort={() => handleSort('template_type_code')}>
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('version')} onSort={() => handleSort('version')}>
                  Version
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('updated_at')} onSort={() => handleSort('updated_at')}>
                  Updated
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.template_type_code}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.version}</TableCell>
                  <TableCell className="text-sm text-gray-600">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-violet-600 text-sm" onClick={() => navigate(`${BASE}/${r.id}`)}>
                      View
                    </button>
                    <button type="button" className="text-sm" onClick={() => navigate(`${BASE}/${r.id}/edit`)}>
                      Edit
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
