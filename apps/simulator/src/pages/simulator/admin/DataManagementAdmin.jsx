/**
 * Data Management (GDPR compliance) — Simulator admin dashboard (v1108). Simulator parity for
 * apps/platform/src/pages/platform-app/DataManagementAdmin.jsx, against sim.* tables via
 * simGdprService.js. Reached from the sim_sec_knowledge sidebar section (SQL/v1122).
 * Route: /simulator/admin/data-management
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Database, ShieldAlert, FileDown, UserX, MessageSquareWarning, LayoutGrid, List as ListIcon, Search, Plus,
} from 'lucide-react'
import { simDb } from '../../../services/supabase/supabaseClient'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import {
  getGdprDashboardData,
  processDataExportRequest,
  processDataDeletionRequest,
} from '../../../services/sim/simGdprService'

const PAGE_SIZE = 20

const TABS = [
  { id: 'exports', label: 'Export Requests', icon: FileDown },
  { id: 'deletions', label: 'Deletion Requests', icon: UserX },
  { id: 'consents', label: 'Consent Logs', icon: MessageSquareWarning },
  { id: 'breaches', label: 'Breach Records', icon: ShieldAlert },
]

export default function DataManagementAdmin() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState('checking')
  const [dashboard, setDashboard] = useState(null)
  const [activeTab, setActiveTab] = useState('exports')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('sim-data-management', 'list')
  const [processingId, setProcessingId] = useState(null)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'requested_at', direction: 'desc' },
    storageKey: 'nidus-sim-data-management-sort',
  })

  const checkAccess = useCallback(async () => {
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return setAccess('blocked')
    const { data: userRow } = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (!userRow) return setAccess('blocked')

    const [ownerRes, roleRes] = await Promise.all([
      simDb.from('accounts').select('id').eq('owner_user_id', userRow.id).limit(1),
      simDb
        .from('user_roles')
        .select('id, roles:role_id(role_name)')
        .eq('user_id', userRow.id)
        .eq('is_active', true),
    ])

    const isOwner = (ownerRes.data || []).length > 0
    const isPmoAdmin = (roleRes.data || []).some((r) =>
      ['PMO Admin', 'pmo_admin', 'sim_pmo_admin', 'simulator_admin', 'System Admin'].includes(r.roles?.role_name),
    )
    setAccess(isOwner || isPmoAdmin ? 'allowed' : 'blocked')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getGdprDashboardData()
    if (res.success) setDashboard(res.data)
    else toast.error(res.message || 'Failed to load Data Management dashboard')
    setLoading(false)
  }, [])

  useEffect(() => { checkAccess() }, [checkAccess])
  useEffect(() => { if (access === 'allowed') load() }, [access, load])

  const handleProcessExport = async (requestId) => {
    setProcessingId(requestId)
    try {
      const res = await processDataExportRequest(requestId)
      if (!res.success) {
        toast.error(res.message || 'Failed to process export request')
        return
      }
      showSuccess({ recordId: requestId, operation: 'updated', message: 'Data export request processed.' })
      load()
    } finally {
      setProcessingId(null)
    }
  }

  const handleProcessDeletion = async (requestId) => {
    setProcessingId(requestId)
    try {
      const res = await processDataDeletionRequest(requestId)
      if (!res.success) {
        toast.error(res.message || 'Failed to process deletion request')
        return
      }
      showSuccess({ recordId: requestId, operation: 'updated', message: 'Data deletion request processed — affected records anonymized.' })
      load()
    } finally {
      setProcessingId(null)
    }
  }

  const rowsForTab = useMemo(() => {
    if (!dashboard) return []
    if (activeTab === 'exports') return dashboard.exportRequests
    if (activeTab === 'deletions') return dashboard.deletionRequests
    if (activeTab === 'consents') return dashboard.consentLogs
    return dashboard.breachRecords
  }, [dashboard, activeTab])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rowsForTab
    return rowsForTab.filter((r) => JSON.stringify(r).toLowerCase().includes(term))
  }, [rowsForTab, search])

  const sortAccessors = useMemo(() => ({
    requested_at: (r) => r.requested_at || r.created_at || '',
    created_at: (r) => r.created_at || '',
    status: (r) => r.request_status || r.status || '',
    severity: (r) => r.severity || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const goToTab = (tabId) => { setActiveTab(tabId); setPage(1) }

  if (access === 'checking' || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (access === 'blocked') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Data Management is available to PMO Admin and Account Owner only.
        </p>
      </div>
    )
  }

  const stats = dashboard?.stats || { totalConsents: 0, pendingExports: 0, pendingDeletions: 0, activeBreaches: 0 }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Database className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Data Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            GDPR compliance — consent, data export/deletion requests, and breach tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/simulator/admin/data-management/breaches/new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Log Breach
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { id: 'consents', label: 'Total Consents', value: stats.totalConsents, icon: MessageSquareWarning, color: 'text-sky-600 dark:text-sky-400' },
          { id: 'exports', label: 'Pending Exports', value: stats.pendingExports, icon: FileDown, color: 'text-amber-600 dark:text-amber-400' },
          { id: 'deletions', label: 'Pending Deletions', value: stats.pendingDeletions, icon: UserX, color: 'text-rose-600 dark:text-rose-400' },
          { id: 'breaches', label: 'Active Breaches', value: stats.activeBreaches, icon: ShieldAlert, color: 'text-red-600 dark:text-red-400' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => goToTab(card.id)}
              className="text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </button>
          )
        })}
      </div>

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-x-6 gap-y-1 -mb-px" aria-label="Data Management sections">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
          <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Table view">
            <ListIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Card view">
            <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No records.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {activeTab === 'exports' && (
                  <>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('requested_at')} onSort={() => handleSort('requested_at')} className="!normal-case whitespace-nowrap">Requested</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Format</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Action</th>
                  </>
                )}
                {activeTab === 'deletions' && (
                  <>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('requested_at')} onSort={() => handleSort('requested_at')} className="!normal-case whitespace-nowrap">Requested</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Scheduled</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Action</th>
                  </>
                )}
                {activeTab === 'consents' && (
                  <>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('created_at')} onSort={() => handleSort('created_at')} className="!normal-case whitespace-nowrap">Recorded</TableHeaderCell>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Given</th>
                  </>
                )}
                {activeTab === 'breaches' && (
                  <>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('created_at')} onSort={() => handleSort('created_at')} className="!normal-case whitespace-nowrap">Detected</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('severity')} onSort={() => handleSort('severity')} className="!normal-case whitespace-nowrap">Severity</TableHeaderCell>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Affected</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id}>
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  {activeTab === 'exports' && (
                    <>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.requested_at ? new Date(row.requested_at).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">{row.request_status}</td>
                      <td className="px-3 py-3 text-sm uppercase text-gray-600 dark:text-gray-300">{row.export_format}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={row.request_status !== 'pending' || processingId === row.id}
                          onClick={() => handleProcessExport(row.id)}
                          className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {processingId === row.id ? 'Processing…' : 'Process'}
                        </button>
                      </td>
                    </>
                  )}
                  {activeTab === 'deletions' && (
                    <>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.requested_at ? new Date(row.requested_at).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">{row.request_status}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.scheduled_deletion_date ? new Date(row.scheduled_deletion_date).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={row.request_status !== 'pending' || processingId === row.id}
                          onClick={() => handleProcessDeletion(row.id)}
                          className="text-sm font-medium text-rose-700 dark:text-rose-400 hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {processingId === row.id ? 'Processing…' : 'Process'}
                        </button>
                      </td>
                    </>
                  )}
                  {activeTab === 'consents' && (
                    <>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.consent_type}</td>
                      <td className="px-3 py-3 text-sm">
                        <span className={row.consent_given ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>
                          {row.consent_given ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'breaches' && (
                    <>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.breach_detected_at ? new Date(row.breach_detected_at).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">{row.severity}</td>
                      <td className="px-3 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">
                        <button
                          type="button"
                          onClick={() => navigate(`/simulator/admin/data-management/breaches/${row.id}/edit`)}
                          className="hover:underline"
                        >
                          {row.status}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.affected_users_count}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((row, index) => (
            <div key={row.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1.5">
              <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
              {activeTab === 'exports' && (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{row.request_status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.requested_at ? new Date(row.requested_at).toLocaleString() : '—'} · {row.export_format?.toUpperCase()}</p>
                  <button
                    type="button"
                    disabled={row.request_status !== 'pending' || processingId === row.id}
                    onClick={() => handleProcessExport(row.id)}
                    className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-40"
                  >
                    {processingId === row.id ? 'Processing…' : 'Process'}
                  </button>
                </>
              )}
              {activeTab === 'deletions' && (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{row.request_status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled {row.scheduled_deletion_date ? new Date(row.scheduled_deletion_date).toLocaleDateString() : '—'}</p>
                  <button
                    type="button"
                    disabled={row.request_status !== 'pending' || processingId === row.id}
                    onClick={() => handleProcessDeletion(row.id)}
                    className="text-sm font-medium text-rose-700 dark:text-rose-400 hover:underline disabled:opacity-40"
                  >
                    {processingId === row.id ? 'Processing…' : 'Process'}
                  </button>
                </>
              )}
              {activeTab === 'consents' && (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{row.consent_type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'} · {row.consent_given ? 'Given' : 'Not given'}</p>
                </>
              )}
              {activeTab === 'breaches' && (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{row.severity} · {row.status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.affected_users_count} affected · {row.breach_detected_at ? new Date(row.breach_detected_at).toLocaleDateString() : '—'}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/simulator/admin/data-management/breaches/${row.id}/edit`)}
                    className="text-sm font-medium text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    View / update
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
