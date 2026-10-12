/**
 * Vendor category lookup (Procurement, v1208). Sidebar destination under Procurement.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tags, Plus, LayoutGrid, List as ListIcon } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listVendorCategories, deleteVendorCategory } from '../services/procurementService'

export default function VendorCategoryListPage({ basePath = '/platform/pm/procurement/vendor-categories' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('procurement-vendor-categories', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'category_name', direction: 'asc' },
    storageKey: 'procurement-vendor-categories-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const acctId = await getCurrentUserAccountId()
      setAccountId(acctId)
      if (!acctId) return
      setRows(await listVendorCategories(acctId))
    } catch (err) {
      setLoadError(err?.message || 'Could not load vendor categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) => row.category_name?.toLowerCase().includes(q) || row.description?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const sortAccessors = useMemo(
    () => ({
      category_name: (row) => row.category_name || '',
      description: (row) => row.description || '',
      is_active: (row) => (row.is_active === false ? 'inactive' : 'active'),
    }),
    []
  )
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'category_name', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'is_active', label: 'Active' },
  ]

  const openPath = (row) => `${basePath}/${encodeURIComponent(row.category_name)}`

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.category_name}"?`)) return
    await deleteVendorCategory(row.id)
    showSuccess({ recordId: row.category_name, operation: 'deleted', message: `"${row.category_name}" was deleted.` })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading categories…</div>
  }
  if (loadError) {
    return <div className="p-8 text-red-600 dark:text-red-400">{loadError}</div>
  }
  if (!accountId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Could not resolve your organisation.</div>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Categories</h1>
        </div>
        <button onClick={() => navigate(`${basePath}/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="VendorCategories" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No categories yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category_name')} onSort={() => handleSort('category_name')} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('description')} onSort={() => handleSort('description')} className="!normal-case whitespace-nowrap">Description</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('is_active')} onSort={() => handleSort('is_active')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.category_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.is_active === false ? 'Inactive' : 'Active'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View category" onClick={() => navigate(openPath(row))} />
                        <RowActionButton variant="edit" label="Edit category" onClick={() => navigate(`${openPath(row)}/edit`)} />
                        <RowActionButton variant="delete" label="Delete category" onClick={() => handleDelete(row)} />
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
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.category_name}</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">{row.description || '—'}</div>
                <div className="text-xs text-gray-700 dark:text-gray-200">{row.is_active === false ? 'Inactive' : 'Active'}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View category" onClick={() => navigate(openPath(row))} />
                  <RowActionButton variant="edit" label="Edit category" onClick={() => navigate(`${openPath(row)}/edit`)} />
                  <RowActionButton variant="delete" label="Delete category" onClick={() => handleDelete(row)} />
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
