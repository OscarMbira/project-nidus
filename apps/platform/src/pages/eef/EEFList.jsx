import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, PauseCircle } from 'lucide-react'
import { RowActionButton, RowNumberBadge, DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui'
import { listEEFs, ensureEefOpaSampleForAccount, deleteEEF } from '../../services/eefService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import ViewToggle from '@nidus/ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  TableHeaderCell,
  TableCell,
  TableRowNumberHeader,
  TableRowNumberCell,
} from '@nidus/ui/Table'

/** Human-facing record id until Admin display_id is wired for EEF. */
function eefRecordId(r) {
  const ref = (r?.source_reference || '').trim()
  if (ref) return ref
  if (!r?.id) return '—'
  return String(r.id).slice(0, 8).toUpperCase()
}

const EXPORT_COLS = [
  { key: 'record_id', label: 'Record ID' },
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
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useViewMode('platform-eef-list', 'list')
  const [pageTab, setPageTab] = useState('dashboard') // 'dashboard' | 'register'
  const [statusFilter, setStatusFilter] = useState('')
  const [holdOnly, setHoldOnly] = useState(false)

  async function handleDelete(row) {
    const label = eefRecordId(row) || row.title || 'this EEF'
    if (!window.confirm(`Delete EEF "${label}"? This cannot be undone.`)) return
    setDeletingId(row.id)
    const { error } = await deleteEEF(row.id)
    setDeletingId(null)
    if (error) {
      setErr(error.message || 'Could not delete EEF.')
      return
    }
    setListVersion((v) => v + 1)
  }

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'title', direction: 'asc' },
    storageKey: 'nidus-eef-list-sort',
  })

  const accessors = useMemo(
    () => ({
      record_id: (r) => eefRecordId(r),
      title: (r) => r.title ?? '',
      eef_type: (r) => r.eef_type ?? '',
      impact_level: (r) => r.impact_level ?? '',
      status: (r) => r.status ?? '',
      is_on_hold: (r) => (r.is_on_hold ? 'Yes' : 'No'),
      updated_at: (r) => r.updated_at ?? '',
      created_at: (r) => r.created_at ?? '',
    }),
    []
  )

  const filteredRows = useMemo(() => {
    let list = rows
    if (holdOnly) list = list.filter((r) => r.is_on_hold)
    if (statusFilter) list = list.filter((r) => (r.status || 'unknown') === statusFilter)
    return list
  }, [rows, statusFilter, holdOnly])

  const displayRows = useMemo(() => sortedData(filteredRows, accessors), [filteredRows, sortedData, accessors])

  const showRegisterFiltered = (status, hold = false) => {
    setStatusFilter(status)
    setHoldOnly(hold)
    setPageTab('register')
  }

  const dashboardStats = useMemo(() => {
    const byStatus = {}
    let onHold = 0
    for (const r of rows) {
      const k = r.status || 'unknown'
      byStatus[k] = (byStatus[k] || 0) + 1
      if (r.is_on_hold) onHold += 1
    }
    return {
      total: rows.length,
      onHold,
      topStatuses: Object.entries(byStatus).sort((a, b) => b[1] - a[1]).slice(0, 3),
    }
  }, [rows])

  const activeEEFs = useMemo(
    () =>
      [...rows]
        .filter((r) => r.is_on_hold || String(r.status || '').toLowerCase() === 'active')
        .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
        .slice(0, 5),
    [rows]
  )

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => ({
        ...r,
        record_id: eefRecordId(r),
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
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Environment Factors</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organisation-wide factors that influence delivery.</p>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="EEF sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap gap-2 justify-end">
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
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" role="tabpanel" aria-label="EEF dashboard">
          <DashboardStatCard label="Total" value={loading ? '—' : dashboardStats.total} onClick={() => showRegisterFiltered('')} />
          <DashboardStatCard
            label="On hold"
            value={loading ? '—' : dashboardStats.onHold}
            accentClassName="text-amber-700 dark:text-amber-300"
            onClick={() => showRegisterFiltered('', true)}
          />
          {dashboardStats.topStatuses.map(([status, count]) => (
            <DashboardStatCard
              key={status}
              label={status.replace(/_/g, ' ')}
              value={loading ? '—' : count}
              className="capitalize"
              onClick={() => showRegisterFiltered(status)}
            />
          ))}
        </div>
      )}

      {pageTab === 'dashboard' && (
        <RegisterOpenItemsWidget
          title="Active Enterprise Environmental Factors"
          icon={PauseCircle}
          rows={activeEEFs}
          loading={loading}
          columns={[
            { key: 'record_id', label: 'Record ID', sortAccessor: (r) => eefRecordId(r), render: (r) => eefRecordId(r), className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
            { key: 'title', label: 'Title', className: 'font-medium text-gray-900 dark:text-white' },
            { key: 'eef_type', label: 'Type', className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize' },
            { key: 'status', label: 'Status', className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize' },
          ]}
          rowKey={(r) => r.id}
          searchFields={['title']}
          onRowClick={(r) => navigate(`/platform/eef/${r.id}`)}
          onViewAll={() => setPageTab('register')}
          viewAllLabel="Open full EEF Register"
          emptyMessage="No active EEF entries"
        />
      )}

      {pageTab === 'register' && (
      <div role="tabpanel" aria-label="EEF register">
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

      {(statusFilter || holdOnly) && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          {statusFilter && (
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
              {statusFilter.replace(/_/g, ' ')} only
            </span>
          )}
          {holdOnly && (
            <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
              On hold only
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('')
              setHoldOnly(false)
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

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
              className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2 shadow-sm"
            >
              <RowNumberBadge number={getDisplayRowNumber(index)} className="absolute top-3 right-3" />
              <button type="button" onClick={() => navigate(`/platform/eef/${r.id}`)} className="text-left font-semibold text-gray-900 dark:text-white hover:underline pr-10">
                {r.title}
              </button>
              <div className="font-mono text-xs text-gray-500 dark:text-gray-400" title={r.id}>
                {eefRecordId(r)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                <span>{r.eef_type}</span>
                <span>·</span>
                <span>{r.impact_level}</span>
                <span>·</span>
                <span>{r.status}</span>
                {r.is_on_hold && <span className="text-amber-600">On hold</span>}
              </div>
              <div className="mt-auto flex gap-2 pt-2">
                <RowActionButton variant="view" label="View EEF" onClick={() => navigate(`/platform/eef/${r.id}`)} />
                <RowActionButton variant="edit" label="Edit EEF" onClick={() => navigate(`/platform/eef/${r.id}/edit`)} />
                <RowActionButton
                  variant="delete"
                  label="Delete EEF"
                  onClick={() => handleDelete(r)}
                  disabled={deletingId === r.id}
                />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-[72rem] w-full border-collapse divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('record_id')}
                  onSort={() => handleSort('record_id')}
                  className="!px-3 whitespace-nowrap min-w-[9rem]"
                >
                  Record ID
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('title')}
                  onSort={() => handleSort('title')}
                  className="!px-3 min-w-[16rem]"
                >
                  Title
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('eef_type')}
                  onSort={() => handleSort('eef_type')}
                  className="!px-3 whitespace-nowrap"
                >
                  Type
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('impact_level')}
                  onSort={() => handleSort('impact_level')}
                  className="!px-3 whitespace-nowrap"
                >
                  Impact
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('status')}
                  onSort={() => handleSort('status')}
                  className="!px-3 whitespace-nowrap min-w-[8rem]"
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell className="!px-3 whitespace-nowrap">Hold</TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('updated_at')}
                  onSort={() => handleSort('updated_at')}
                  className="!px-3 whitespace-nowrap min-w-[11rem]"
                >
                  Updated
                </TableHeaderCell>
                <TableHeaderCell
                  sortable={false}
                  className="!normal-case !px-3 text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]"
                >
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {displayRows.map((r, index) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <TableCell className="!px-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap" title={r.id}>
                    {eefRecordId(r)}
                  </TableCell>
                  <TableCell className="!px-3 font-medium text-gray-900 dark:text-white">{r.title}</TableCell>
                  <TableCell className="!px-3 whitespace-nowrap">{r.eef_type}</TableCell>
                  <TableCell className="!px-3 whitespace-nowrap">{r.impact_level}</TableCell>
                  <TableCell className="!px-3 whitespace-nowrap">{r.status}</TableCell>
                  <TableCell className="!px-3 whitespace-nowrap">{r.is_on_hold ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="!px-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </TableCell>
                  <td
                    className="px-3 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 justify-end">
                      <RowActionButton variant="view" label="View EEF" onClick={() => navigate(`/platform/eef/${r.id}`)} />
                      <RowActionButton variant="edit" label="Edit EEF" onClick={() => navigate(`/platform/eef/${r.id}/edit`)} />
                      <RowActionButton
                        variant="delete"
                        label="Delete EEF"
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      )}
    </div>
  )
}
