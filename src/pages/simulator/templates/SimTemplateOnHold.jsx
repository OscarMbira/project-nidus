import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Eye } from 'lucide-react'
import { listCopiesForAccount } from '../../../services/sim/simProjectTemplateCopyService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'
import { useSortableTable } from '../../../hooks/useSortableTable'
import { useViewMode } from '../../../hooks/useViewMode'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import ViewToggle from '../../../components/ui/ViewToggle'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'

const BASE = '/simulator/templates'
const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'project_name', label: 'Simulation run' },
  { key: 'status', label: 'Status' },
  { key: 'updated_at', label: 'Updated' },
]

export default function SimTemplateOnHold() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('sim-template-on-hold', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-sim-template-on-hold-sort',
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
      const { data } = await listCopiesForAccount(accountId, { search: debounced })
      const onHold = (data || [])
        .filter((r) => r.is_on_hold || r.status === 'draft')
        .map((r) => ({
          ...r,
          project_name: r.project_id ? `Run ${String(r.project_id).slice(0, 8)}…` : '—',
        }))
      setRows(onHold)
      setLoading(false)
    })()
  }, [accountId, debounced])

  const accessors = useMemo(
    () => ({
      title: (r) => r.title ?? '',
      project_name: (r) => r.project_name ?? '',
      status: (r) => r.status ?? '',
      updated_at: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : ''),
    }),
    []
  )
  const displayRows = useMemo(() => sortedData(rows, accessors), [rows, sortedData, accessors])
  const exportRows = useMemo(() => displayRows.map((r) => ({ ...r, updated_at: accessors.updated_at(r) })), [displayRows, accessors])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template copy drafts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">On-hold and draft copies (simulator).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportListMenu
            columns={EXPORT_COLS}
            data={exportRows}
            baseFilename="Sim_Template_Copies_On_hold"
            disabled={!exportRows.length}
          />
          <Link to={BASE} className="text-violet-600 dark:text-violet-400 text-sm min-h-[44px] inline-flex items-center">
            Browse library
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
            placeholder="Search…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Sim drafts layout" />
      </div>
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {displayRows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <button
                type="button"
                onClick={() => navigate(`${BASE}/copies/${r.id}`)}
                className="text-left font-semibold text-gray-900 dark:text-white hover:underline w-full"
              >
                {r.title}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {r.project_name} · {r.status}
              </p>
              <p className="text-xs text-gray-500 mt-1">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</p>
              <button
                type="button"
                onClick={() => navigate(`${BASE}/copies/${r.id}`)}
                className="mt-3 inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400"
              >
                <Eye className="h-4 w-4" /> View
              </button>
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
                  sortDirection={getSortDirectionForColumn('project_name')}
                  onSort={() => handleSort('project_name')}
                >
                  Run
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('updated_at')}
                  onSort={() => handleSort('updated_at')}
                >
                  Updated
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Open</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.project_name}</TableCell>
                  <TableCell>{r.status}</TableCell>
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
      {!loading && displayRows.length === 0 && <p className="text-gray-600 dark:text-gray-400 mt-6">No draft copies.</p>}
    </div>
  )
}
