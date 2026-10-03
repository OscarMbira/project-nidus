/**
 * Milestone Register — list page (v966 Phase 11). Standard pattern: dedicated routed page
 * (rule 65), sortable Table-List + Card toggle with row numbers (rules 40/41/44), export menu
 * (rule 38), theme-aware (rule 28.1). Project context resolved via usePlatformProjectId() (rule
 * 16.1) — flat /platform/milestones route, same convention as Assumptions/Risks.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List as ListIcon, Flag } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useToast } from '@nidus/shared/hooks/useToast'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listMilestones, deleteMilestone } from '../../services/milestoneService'

const PAGE_SIZE = 20

const STATUS_LABELS = {
  planned: 'Planned',
  at_risk: 'At Risk',
  achieved: 'Achieved',
  missed: 'Missed',
  slipped: 'Slipped',
}

const STATUS_BADGE = {
  planned: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  at_risk: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  achieved: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  missed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  slipped: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status] || STATUS_BADGE.planned}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function MilestonesListPage() {
  const { projectId, routeKey, loading: projectLoading } = usePlatformProjectId()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('platform-milestones-page', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'target_date', direction: 'asc' },
    storageKey: 'nidus-milestones-sort',
  })

  const load = async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    const result = await listMilestones(projectId)
    setMilestones(result.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const filtered = useMemo(() => {
    let rows = milestones
    if (statusFilter) rows = rows.filter((m) => m.status === statusFilter)
    const term = search.trim().toLowerCase()
    if (term) rows = rows.filter((m) => (m.milestone_name || '').toLowerCase().includes(term))
    return rows
  }, [milestones, search, statusFilter])

  const sortAccessors = useMemo(() => ({
    milestone_name: (m) => m.milestone_name || '',
    status: (m) => m.status || '',
    target_date: (m) => m.target_date || '',
    forecast_date: (m) => m.forecast_date || '',
    owner: (m) => m.owner?.full_name || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'milestone_name', label: 'Milestone' },
    { key: 'status', label: 'Status' },
    { key: 'target_date', label: 'Target Date' },
    { key: 'forecast_date', label: 'Forecast Date' },
    { key: 'actual_date', label: 'Actual Date' },
    { key: 'owner', label: 'Owner' },
  ]
  const exportRows = sorted.map((m) => ({
    milestone_name: m.milestone_name,
    status: STATUS_LABELS[m.status] || m.status,
    target_date: m.target_date,
    forecast_date: m.forecast_date,
    actual_date: m.actual_date,
    owner: m.owner?.full_name || '',
  }))

  const handleDelete = async (milestone) => {
    if (!window.confirm(`Delete milestone "${milestone.milestone_name}"? This cannot be undone.`)) return
    const result = await deleteMilestone(milestone.id)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete milestone')
      return
    }
    toast.success('Milestone deleted.')
    load()
  }

  if (projectLoading || loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading milestones…</div>
  }
  if (!projectId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Select a project to view its Milestone Register.</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="h-6 w-6 text-blue-500" />
            Milestone Register
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Project milestones with target, forecast, and actual dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="milestone-register" disabled={exportRows.length === 0} />
          <button
            type="button"
            onClick={() => navigate(`/platform/milestones/create${projectSuffix}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Milestone
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search milestones…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
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
          No milestones recorded yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('milestone_name')} onSort={() => handleSort('milestone_name')} className="!normal-case whitespace-nowrap">
                  Milestone
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')} className="!normal-case whitespace-nowrap">
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('target_date')} onSort={() => handleSort('target_date')} className="!normal-case whitespace-nowrap">
                  Target Date
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('forecast_date')} onSort={() => handleSort('forecast_date')} className="!normal-case whitespace-nowrap">
                  Forecast Date
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('owner')} onSort={() => handleSort('owner')} className="!normal-case whitespace-nowrap">
                  Owner
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((m, index) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">{m.milestone_name}</td>
                  <td className="px-4 py-3 text-sm"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.target_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.forecast_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.owner?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View milestone" onClick={() => navigate(`/platform/milestones/${m.id}${projectSuffix}`)} />
                      <RowActionButton variant="edit" label="Edit milestone" onClick={() => navigate(`/platform/milestones/${m.id}/edit${projectSuffix}`)} />
                      <RowActionButton variant="delete" label="Delete milestone" onClick={() => handleDelete(m)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((m, index) => (
            <div key={m.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <StatusBadge status={m.status} />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{m.milestone_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Target: {m.target_date || '—'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {m.owner?.full_name || '—'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View milestone" onClick={() => navigate(`/platform/milestones/${m.id}${projectSuffix}`)} />
                <RowActionButton variant="edit" label="Edit milestone" onClick={() => navigate(`/platform/milestones/${m.id}/edit${projectSuffix}`)} />
                <RowActionButton variant="delete" label="Delete milestone" onClick={() => handleDelete(m)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
