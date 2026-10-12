/**
 * Configuration item types for the current project's configuration strategy.
 * Sidebar destination under Quality.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getConfigurationMSByProject } from '../services/configurationManagementStrategyService'
import { getItemTypes, deleteItemType } from '../services/cfgItemTypesService'

export default function ConfigurationItemTypeListPage() {
  const navigate = useNavigate()
  const { projectId, routeKey } = usePlatformProjectId()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('configuration-item-types', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'item_type_name', direction: 'asc' },
    storageKey: 'configuration-item-types-sort',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setLoadError(null)
    try {
      const strategy = await getConfigurationMSByProject(projectId)
      if (!strategy?.id) {
        setRows([])
        setLoadError('No configuration management strategy found for this project.')
        return
      }
      setRows(await getItemTypes(strategy.id))
    } catch (err) {
      setLoadError(err?.message || 'Could not load item types.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q ? rows : rows.filter((row) =>
      [row.item_type_name, row.item_type_code, row.item_type_description].some((value) => String(value || '').toLowerCase().includes(q))
    )
    return [...list].sort((a, b) => {
      const byName = String(a.item_type_name || '').localeCompare(String(b.item_type_name || ''), undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
  }, [rows, search])

  const sorted = sortedData(filtered, {
    item_type_name: (row) => row.item_type_name || '',
    item_type_code: (row) => row.item_type_code || '',
    classification_level: (row) => row.classification_level || '',
    control_level: (row) => row.control_level || '',
  })

  const openPath = (row) => platformProjectPath(routeKey, 'configuration-item-types', row.item_type_code || row.id)

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete item type "${row.item_type_name}"?`)) return
    try {
      await deleteItemType(row.id)
      showSuccess({ recordId: row.item_type_code || row.item_type_name, operation: 'deleted', message: `"${row.item_type_name}" was deleted.` })
      load()
    } catch (err) {
      setLoadError(err?.message || 'Could not delete this item type.')
    }
  }

  if (loading) {
    return <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-700 dark:text-gray-200">Loading item types...</div>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration Item Types</h1>
        <button
          type="button"
          onClick={() => navigate(platformProjectPath(routeKey, 'configuration-item-types', 'create'))}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New item type
        </button>
      </div>
      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item types..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu
              columns={[
                { key: 'item_type_name', label: 'Name' },
                { key: 'item_type_code', label: 'Code' },
                { key: 'classification_level', label: 'Classification' },
                { key: 'control_level', label: 'Control' },
              ]}
              data={sorted}
              baseFilename="ConfigurationItemTypes"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Configuration item types layout" />
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-700 dark:text-gray-200">No item types yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('item_type_name')} onSort={() => handleSort('item_type_name')}>Name</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('item_type_code')} onSort={() => handleSort('item_type_code')}>Code</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('classification_level')} onSort={() => handleSort('classification_level')}>Classification</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('control_level')} onSort={() => handleSort('control_level')}>Control</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {sorted.map((row, index) => (
                  <tr key={row.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{row.item_type_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{row.item_type_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{String(row.classification_level || '').replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{row.control_level}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View item type" onClick={() => navigate(openPath(row))} />
                        <RowActionButton variant="edit" label="Edit item type" onClick={() => navigate(`${openPath(row)}/edit`)} />
                        <RowActionButton variant="delete" label="Delete item type" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row, index) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.item_type_name}</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">{row.item_type_code}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View item type" onClick={() => navigate(openPath(row))} />
                  <RowActionButton variant="edit" label="Edit item type" onClick={() => navigate(`${openPath(row)}/edit`)} />
                  <RowActionButton variant="delete" label="Delete item type" onClick={() => handleDelete(row)} />
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
