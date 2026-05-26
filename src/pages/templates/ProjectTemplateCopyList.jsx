import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listCopiesForAccount } from '../../services/projectTemplateCopyService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const BASE = '/platform/templates'
const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'project_name', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'current_version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

export default function ProjectTemplateCopyList() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-template-copy-list', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-template-copy-list-sort',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    ;(async () => setAccountId(await getCurrentUserAccountId()))()
  }, [])

  useEffect(() => {
    if (!accountId) {
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      const { data, error } = await listCopiesForAccount(accountId, { search: debounced })
      if (error) setErr(error.message)
      const mapped = (data || []).map((r) => ({
        ...r,
        project_name: r.project?.project_name || '—',
      }))
      setRows(mapped)
      setLoading(false)
    })()
  }, [accountId, debounced])

  const accessors = useMemo(
    () => ({
      title: (r) => r.title ?? '',
      project_name: (r) => r.project_name ?? '',
      status: (r) => r.status ?? '',
      current_version: (r) => r.current_version ?? '',
      updated_at: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : ''),
    }),
    []
  )
  const displayRows = useMemo(() => sortedData(rows, accessors), [rows, sortedData, accessors])
  const exportRows = useMemo(() => displayRows.map((r, index) => ({ ...r, updated_at: accessors.updated_at(r) })), [displayRows, accessors])

  if (!accountId && !loading) {
    return <div className="p-8 text-center text-gray-600">No organisation context.</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My project templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tailored copies linked to your projects.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Project_Template_Copies" disabled={!exportRows.length} />
          <Link to={`${BASE}/copies/new`} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm min-h-[44px]">
            New copy
          </Link>
        </div>
      </div>
      <div className="mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Copy list layout" />
      </div>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {displayRows.map((r, index) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`${BASE}/copies/${r.id}`)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
            >
              <p className="font-semibold">{r.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {r.project_name} · v{r.current_version}
              </p>
            </button>
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
                  sortDirection={getSortDirectionForColumn('project_name')}
                  onSort={() => handleSort('project_name')}
                >
                  Project
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('current_version')}
                  onSort={() => handleSort('current_version')}
                >
                  Ver
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
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.project_name}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.current_version}</TableCell>
                  <TableCell className="text-sm text-gray-600">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <button type="button" className="text-violet-600 text-sm" onClick={() => navigate(`${BASE}/copies/${r.id}`)}>
                      View
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
