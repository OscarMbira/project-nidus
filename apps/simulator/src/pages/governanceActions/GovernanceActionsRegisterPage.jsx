/**
 * Governance Action Register — list page (Simulator, v966 Phase 12). Mirrors
 * apps/platform/src/pages/governanceActions/GovernanceActionsRegisterPage.jsx against
 * sim.unified_governance_actions_v (see services/governanceActionService.js and
 * SQL/v966aa_phase12_sim_governance_actions_view.sql — Issue + Lesson actions only, no Quality
 * equivalent exists in the sim schema). No create action — actions originate from, and are
 * completed on, each domain's own existing practice page; "View" here navigates there.
 * Standard pattern: dedicated routed page (rule 65), sortable Table-List + Card toggle with row
 * numbers (rules 40/41/44), export menu (rule 38), theme-aware (rule 28.1).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutGrid, List as ListIcon, ListTodo } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getGovernanceActions, GOVERNANCE_ACTION_TYPES, GOVERNANCE_ACTION_STATUSES, getActionTypeLabel } from '../../services/governanceActionService'

const PAGE_SIZE = 20

const STATUS_BADGE = {
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  resolved: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>
      {status}
    </span>
  )
}

export default function GovernanceActionsRegisterPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('platform-governance-actions-page', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'due_date', direction: 'asc' },
    storageKey: 'nidus-governance-actions-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await getGovernanceActions({ actionType: typeFilter || undefined, status: statusFilter || undefined })
      if (!cancelled) {
        setRows(data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [typeFilter, statusFilter])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.record_label || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    record_label: (r) => r.record_label || '',
    action_type_label: (r) => r.action_type_label || '',
    status: (r) => r.status || '',
    assigned_to_name: (r) => r.assigned_to_name || '',
    due_date: (r) => r.due_date || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'action_type_label', label: 'Type' },
    { key: 'record_label', label: 'Action' },
    { key: 'status', label: 'Status' },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'due_date', label: 'Due' },
  ]
  const exportRows = sorted

  const goToRecord = (row) => {
    if (row.view_path) navigate(row.view_path)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading actions…</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-blue-500" />
            Governance Action Register
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pending, resolved, and cancelled actions across Quality, Issue, and Lesson activities.
            Actions are completed on each record's own page — use View to go there.
          </p>
        </div>
        <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="governance-action-register" disabled={exportRows.length === 0} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search actions…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="">All types</option>
          {GOVERNANCE_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>{getActionTypeLabel(t)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm capitalize"
        >
          <option value="">All statuses</option>
          {GOVERNANCE_ACTION_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
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
          No actions match these filters.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('action_type_label')} onSort={() => handleSort('action_type_label')} className="!normal-case whitespace-nowrap">
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('record_label')} onSort={() => handleSort('record_label')} className="!normal-case whitespace-nowrap">
                  Action
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} className="!normal-case whitespace-nowrap">
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('assigned_to_name')} onSort={() => handleSort('assigned_to_name')} className="!normal-case whitespace-nowrap">
                  Assigned To
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('due_date')} onSort={() => handleSort('due_date')} className="!normal-case whitespace-nowrap">
                  Due
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((r, index) => (
                <tr key={`${r.action_type}-${r.action_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{r.action_type_label}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">{r.record_label}</td>
                  <td className="px-4 py-3 text-sm"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.assigned_to_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.due_date || '—'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <RowActionButton variant="view" label="View action" onClick={() => goToRecord(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((r, index) => (
            <div key={`${r.action_type}-${r.action_id}`} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{r.action_type_label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{r.record_label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Assigned to: {r.assigned_to_name || '—'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View action" onClick={() => goToRecord(r)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
