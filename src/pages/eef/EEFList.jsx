import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, PauseCircle } from 'lucide-react'
import { listEEFs, ensureEefOpaSampleForAccount } from '../../services/eefService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table'

const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'eef_type', label: 'Type' },
  { key: 'impact_level', label: 'Impact' },
  { key: 'status', label: 'Status' },
  { key: 'is_on_hold', label: 'On hold' },
  { key: 'updated_at', label: 'Updated' },
]

export default function EEFList() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [contextReady, setContextReady] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedErr, setSeedErr] = useState(null)
  const [listVersion, setListVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-eef-list', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-eef-list-sort',
  })

  const accessors = useMemo(
    () => ({
      title: (r) => r.title ?? '',
      eef_type: (r) => r.eef_type ?? '',
      impact_level: (r) => r.impact_level ?? '',
      status: (r) => r.status ?? '',
      is_on_hold: (r) => (r.is_on_hold ? 'Yes' : 'No'),
      updated_at: (r) => r.updated_at ?? '',
    }),
    []
  )

  const displayRows = useMemo(() => sortedData(rows, accessors), [rows, sortedData, accessors])

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => ({
        ...r,
        is_on_hold: r.is_on_hold ? 'Yes' : 'No',
      })),
    [displayRows]
  )

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!cancelled) {
        setAccountId(id)
        setContextReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!contextReady || !accountId) {
      if (contextReady && !accountId) setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      setSeedErr(null)
      const { data, error } = await listEEFs(accountId, { search: debounced })
      if (cancelled) return
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [contextReady, accountId, debounced, listVersion])

  async function handleLoadSampleData() {
    if (!accountId) return
    setSeedErr(null)
    setSeedLoading(true)
    const { data, error } = await ensureEefOpaSampleForAccount(accountId)
    setSeedLoading(false)
    if (error) {
      setSeedErr(error.message || 'Could not load sample data.')
      return
    }
    if (data && typeof data === 'object' && data.success === false && data.error) {
      setSeedErr(String(data.error))
      return
    }
    setListVersion((v) => v + 1)
  }

  if (!contextReady) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-600 dark:text-gray-400">
        <p>Loading organisation…</p>
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>No organisation context found. Join or create a project under your organisation to use Org Knowledge.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Environment Factors</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Organisation-wide factors that influence delivery.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="EEF_Register" disabled={!exportRows.length} />
          <Link
            to="/platform/eef/on-hold"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium min-h-[44px]"
          >
            <PauseCircle className="h-4 w-4" /> Drafts
          </Link>
          <Link
            to="/platform/eef/bulk-upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium min-h-[44px]"
          >
            Bulk upload
          </Link>
          <Link
            to="/platform/eef/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 min-h-[44px]"
          >
            <Plus className="h-5 w-5" /> Add EEF
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
            placeholder="Search title, description, notes…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px]"
            aria-label="Search EEF records"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="EEF list layout" />
      </div>

      {err && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {err}
        </p>
      )}
      {seedErr && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {seedErr}
        </p>
      )}

      {loading || seedLoading ? (
        <p className="text-gray-600 dark:text-gray-400">{seedLoading ? 'Loading sample…' : 'Loading…'}</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRows.map((r, index) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2 shadow-sm"
            >
              <button type="button" onClick={() => navigate(`/platform/eef/${r.id}`)} className="text-left font-semibold text-gray-900 dark:text-white hover:underline">
                {r.title}
              </button>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                <span>{r.eef_type}</span>
                <span>·</span>
                <span>{r.impact_level}</span>
                <span>·</span>
                <span>{r.status}</span>
                {r.is_on_hold && <span className="text-amber-600">On hold</span>}
              </div>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/platform/eef/${r.id}`)}
                  className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400"
                >
                  <Eye className="h-4 w-4" /> View
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/platform/eef/${r.id}/edit`)}
                  className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('title')}
                  onSort={() => handleSort('title')}
                >
                  Title
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('eef_type')}
                  onSort={() => handleSort('eef_type')}
                >
                  Type
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('impact_level')}
                  onSort={() => handleSort('impact_level')}
                >
                  Impact
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('status')}
                  onSort={() => handleSort('status')}
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell>Hold</TableHeaderCell>
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
                  <TableCell>{r.eef_type}</TableCell>
                  <TableCell>{r.impact_level}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.is_on_hold ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-sky-600 dark:text-sky-400 text-sm" onClick={() => navigate(`/platform/eef/${r.id}`)}>
                      View
                    </button>
                    <button type="button" className="text-gray-700 dark:text-gray-300 text-sm" onClick={() => navigate(`/platform/eef/${r.id}/edit`)}>
                      Edit
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!loading && !seedLoading && !displayRows.length && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 space-y-4 max-w-lg mx-auto">
          <p>No EEF records yet. Create one, import from CSV, or load the starter sample (adds both EEF and OPA).</p>
          <button
            type="button"
            onClick={handleLoadSampleData}
            disabled={seedLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium min-h-[44px] disabled:opacity-50"
          >
            {seedLoading ? 'Loading sample…' : 'Load sample EEF & OPA'}
          </button>
        </div>
      )}
    </div>
  )
}
