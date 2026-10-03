/**
 * Guest Access (GAP-19) — list page. v963 Phase 13 (Simulator).
 * Mirrors apps/platform/src/modules/pmis-gaps/pages/GuestAccessListPage.jsx, adapted for
 * simDb / sim.guest_collaborators (practice_project_id scoping) via
 * usePlanningProjectId — see SQL/v963m_sim_guest_access_training_tables.sql.
 * Replaces the read-only createGapListPage() stub with real CRUD (rule 65).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserPlus } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import RowActionButton from '../../../components/ui/RowActionButton'
import RowNumberBadge from '../../../components/ui/RowNumberBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import { listGuestCollaborators } from '../services/guestAccessService'

const PAGE_SIZE = 20
const PERMISSION_LABEL = { view: 'View only', comment: 'Can comment', limited_edit: 'Limited edit' }

export default function GuestAccessListPage() {
  const navigate = useNavigate()
  const projectId = usePlanningProjectId()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('sim-pmis-guest-access', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'guest_email', direction: 'asc' },
    storageKey: 'sim-pmis-guest-access-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listGuestCollaborators(projectId)
      if (!cancelled) {
        setRows(result.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.guest_email || '').toLowerCase().includes(term) || (r.guest_name || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    guest_email: (r) => r.guest_email || '',
    permission_level: (r) => r.permission_level || '',
    is_active: (r) => (r.is_active ? 1 : 0),
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'guest_email', label: 'Email' },
    { key: 'guest_name', label: 'Name' },
    { key: 'permission_level', label: 'Access' },
    { key: 'is_active', label: 'Active' },
  ]
  const exportRows = sorted.map((r) => ({ guest_email: r.guest_email, guest_name: r.guest_name, permission_level: PERMISSION_LABEL[r.permission_level] || r.permission_level, is_active: r.is_active ? 'Yes' : 'No' }))

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Access</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="guest-access" disabled={exportRows.length === 0} />
          <button type="button" onClick={() => navigate(`create?projectId=${projectId}`)} disabled={!projectId} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" />
            Invite Guest
          </button>
        </div>
      </div>

      <PlanningProjectBar isSim />

      {!projectId ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Select a practice project to manage guest access.</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search guests…" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Table</button>
              <button type="button" onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}>Card</button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : pageRows.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              No guests invited yet.
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableRowNumberHeader className="!normal-case" />
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('guest_email')} onSort={() => handleSort('guest_email')} className="!normal-case whitespace-nowrap">Email</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Name</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('permission_level')} onSort={() => handleSort('permission_level')} className="!normal-case whitespace-nowrap">Access</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('is_active')} onSort={() => handleSort('is_active')} className="!normal-case whitespace-nowrap">Active</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pageRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.guest_email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.guest_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{PERMISSION_LABEL[row.permission_level] || row.permission_level}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          {row.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                        <div className="inline-flex items-center gap-3 justify-end">
                          <RowActionButton variant="view" label="View guest" onClick={() => navigate(`${row.id}`)} />
                          <RowActionButton variant="edit" label="Edit permissions" onClick={() => navigate(`${row.id}/edit`)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageRows.map((row, index) => (
                <div key={row.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-start justify-between">
                    <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {row.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{row.guest_email}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.guest_name || '—'} · {PERMISSION_LABEL[row.permission_level] || row.permission_level}</p>
                  <div className="flex items-center gap-3 pt-2">
                    <RowActionButton variant="view" label="View guest" onClick={() => navigate(`${row.id}`)} />
                    <RowActionButton variant="edit" label="Edit permissions" onClick={() => navigate(`${row.id}/edit`)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
