/**
 * Work Packages List View
 * Lists all work packages for the current project — the PM Dashboard's "Active Work
 * Packages" card links here. Previously this route mounted the single-work-package detail
 * view (WorkPackageView, which requires a :wpId route param that this route never has), so
 * nothing ever rendered. This is the list that was missing.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery'
import { Layers, Search } from 'lucide-react'
import { getWorkPackages } from '../../services/controllingStageService'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const WORK_PACKAGE_COLUMNS = [
  { key: 'wp_reference', label: 'Reference' },
  { key: 'work_package_name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'assigned_to_name', label: 'Assigned To' },
]

const getStatusColor = (status) => {
  switch (status) {
    case 'closed':
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'authorized':
    case 'accepted':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function WorkPackagesListView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [workPackages, setWorkPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode('pm-work-packages', 'list')
  const [activeOnly, setActiveOnly] = useState(false)

  const initialQueryFilter = useInitialFilterFromQuery(['filter'])
  useEffect(() => {
    if (initialQueryFilter.filter === 'active') setActiveOnly(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryFilter.filter])

  useEffect(() => {
    if (!projectId) {
      setWorkPackages([])
      setLoading(false)
      return
    }
    fetchWorkPackages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchWorkPackages = async () => {
    setLoading(true)
    try {
      const data = await getWorkPackages(projectId)
      setWorkPackages(data || [])
    } catch (error) {
      console.error('Error fetching work packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = workPackages.filter((wp) => {
    const matchesSearch = !search ||
      wp.work_package_name?.toLowerCase().includes(search.toLowerCase()) ||
      (wp.wp_reference || wp.work_package_code || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = activeOnly
      ? ['authorized', 'accepted', 'in_progress'].includes(wp.status)
      : !statusFilter || wp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const exportRows = filtered.map((wp) => ({
    ...wp,
    assigned_to_name: wp.assigned_to?.full_name || wp.assigned_to?.email || '',
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Work Packages
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All work packages for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Work packages layout" />
          <ExportListMenu columns={WORK_PACKAGE_COLUMNS} data={exportRows} baseFilename="WorkPackages" disabled={!exportRows.length} />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search work packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setActiveOnly(false)
              setStatusFilter(e.target.value)
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="authorized">Authorized</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {activeOnly && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              Active only (authorized, accepted, in progress)
            </span>
            <button type="button" onClick={() => setActiveOnly(false)} className="text-blue-600 dark:text-blue-400 hover:underline">
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No work packages found.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable={false} className="!normal-case">Reference</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Name</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Assigned To</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Stage</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((wp, index) => (
                  <tr key={wp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                      {wp.wp_reference || wp.work_package_code || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={platformProjectPath(routeKey, 'work-packages', wp.wp_reference || wp.id)}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {wp.work_package_name || 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(wp.status)}`}>
                        {(wp.status || 'draft').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {wp.assigned_to?.full_name || wp.assigned_to?.email || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {wp.stage_boundary?.stage_name || wp.stage_boundary?.gate_name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wp, index) => (
            <Link
              key={wp.id}
              to={platformProjectPath(routeKey, 'work-packages', wp.wp_reference || wp.id)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {wp.wp_reference || wp.work_package_code || '—'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {wp.work_package_name || 'Untitled'}
              </h3>
              <span className={`self-start px-2 py-1 rounded text-xs font-medium capitalize mb-3 ${getStatusColor(wp.status)}`}>
                {(wp.status || 'draft').replace('_', ' ')}
              </span>
              <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                {wp.assigned_to?.full_name || wp.assigned_to?.email || 'Unassigned'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
