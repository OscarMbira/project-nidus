import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, PauseCircle } from 'lucide-react'
import { listEEFs } from '../../../services/sim/simEEFService'
import { ensureEefOpaSampleForAccount } from '../../../services/eefService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import ViewToggle from '../../../components/ui/ViewToggle'
import { useViewMode } from '../../../hooks/useViewMode'
import { useSortableTable } from '../../../hooks/useSortableTable'
import { Table, TableBody, TableHeader, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'

const EXPORT_COLS = [
  { key: 'title', label: 'Title' },
  { key: 'eef_type', label: 'Type' },
  { key: 'impact_level', label: 'Impact' },
  { key: 'status', label: 'Status' },
  { key: 'is_on_hold', label: 'On hold' },
  { key: 'updated_at', label: 'Updated' },
]

export default function SimEEFList() {
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
  const [viewMode, setViewMode] = useViewMode('sim-eef-list', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'nidus-sim-eef-list-sort',
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
    let c = false
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!c) {
        setAccountId(id)
        setContextReady(true)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    if (!contextReady || !accountId) {
      if (contextReady && !accountId) setLoading(false)
      return
    }
    let c = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      setSeedErr(null)
      const { data, error } = await listEEFs(accountId, { search: debounced })
      if (c) return
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
    return () => {
      c = true
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

  const base = '/simulator/eef'

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
        <p>No organisation context found. Use the same account you use for Platform projects.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulator — Environment Factors</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Practice EEF records (sim schema).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={exportRows} baseFilename="Sim_EEF_Register" disabled={!exportRows.length} />
          <Link to={`${base}/on-hold`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]">
            <PauseCircle className="h-4 w-4" /> Drafts
          </Link>
          <Link to={`${base}/bulk-upload`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]">
            Bulk upload
          </Link>
          <Link to={`${base}/new`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm min-h-[44px]">
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
            placeholder="Search…"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Sim EEF layout" />
      </div>
      {err && <p className="text-red-600 dark:text-red-400 mb-4">{err}</p>}
      {seedErr && <p className="text-red-600 dark:text-red-400 mb-4">{seedErr}</p>}
      {loading || seedLoading ? (
        <p className="text-gray-600 dark:text-gray-400">{seedLoading ? 'Loading sample…' : 'Loading…'}</p>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRows.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <button type="button" onClick={() => navigate(`${base}/${r.id}`)} className="text-left font-semibold text-gray-900 dark:text-white hover:underline">
                {r.title}
              </button>
              <div className="mt-2 flex gap-2 text-sm">
                <button type="button" className="text-sky-600" onClick={() => navigate(`${base}/${r.id}`)}>
                  <Eye className="h-4 w-4 inline" /> View
                </button>
                <button type="button" className="text-gray-700 dark:text-gray-300" onClick={() => navigate(`${base}/${r.id}/edit`)}>
                  <Pencil className="h-4 w-4 inline" /> Edit
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
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')}>
                  Title
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('eef_type')} onSort={() => handleSort('eef_type')}>
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>
                  Status
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.eef_type}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <button type="button" className="text-sky-600 text-sm" onClick={() => navigate(`${base}/${r.id}`)}>
                      View
                    </button>
                    <button type="button" className="text-sm" onClick={() => navigate(`${base}/${r.id}/edit`)}>
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
          <p>No EEF records yet. Add your own or load the starter sample (adds both EEF and OPA in sim).</p>
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
