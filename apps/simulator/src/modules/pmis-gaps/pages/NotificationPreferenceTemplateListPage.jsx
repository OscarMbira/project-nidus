/**
 * Notification Preference Templates — role-based defaults (GAP-21, v963 Phase 15,
 * Simulator port). Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * NotificationPreferenceTemplateListPage.jsx. sim.notification_preference_templates has no
 * PMO-admin concept — open read/write to any authenticated user (see
 * notificationPreferencesService.js header). Real list/create/edit, rules 40/41/44/61/38.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, LayoutGrid, List as ListIcon, ArrowLeft } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
import { listTemplates, deleteTemplate } from '../services/notificationPreferencesService'

const PAGE_SIZE = 20
const BASE_PATH_DEFAULT = '/simulator/pmo/admin/notification-templates'

export default function NotificationPreferenceTemplateListPage({ basePath = BASE_PATH_DEFAULT }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('notification-templates-sim', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'template_name', direction: 'asc' },
    storageKey: 'notification-templates-sim-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const rows = await listTemplates()
    setTemplates(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) => t.template_name?.toLowerCase().includes(q) || t.role_name?.toLowerCase().includes(q) || t.event_category?.toLowerCase().includes(q)
    )
  }, [templates, search])

  const sortAccessors = useMemo(
    () => ({
      template_name: (r) => r.template_name || '',
      role_name: (r) => r.role_name || '',
      event_category: (r) => r.event_category || '',
    }),
    []
  )
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'template_name', label: 'Template' },
    { key: 'role_name', label: 'Role' },
    { key: 'event_category', label: 'Event Category' },
    { key: 'frequency', label: 'Frequency' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete template "${row.template_name}"?`)) return
    await deleteTemplate(row.id)
    showSuccess({ recordId: row.template_name, operation: 'deleted', message: `"${row.template_name}" was deleted.` })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading templates…</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preference Templates</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Default channel/frequency settings applied by role.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`${basePath}/create`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="NotificationTemplates" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No templates yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('template_name')} onSort={() => handleSort('template_name')} className="!normal-case whitespace-nowrap">Template</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('role_name')} onSort={() => handleSort('role_name')} className="!normal-case whitespace-nowrap">Role</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('event_category')} onSort={() => handleSort('event_category')} className="!normal-case whitespace-nowrap">Event Category</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Frequency</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index, { pageSize: PAGE_SIZE })} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.template_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.role_name || 'All roles'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.event_category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.frequency}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View template" onClick={() => navigate(`${basePath}/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit template" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete template" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.template_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{row.role_name || 'All roles'} · {row.event_category}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View template" onClick={() => navigate(`${basePath}/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit template" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete template" onClick={() => handleDelete(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
