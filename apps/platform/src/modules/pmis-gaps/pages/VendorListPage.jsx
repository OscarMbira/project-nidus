/**
 * Vendor register (Procurement, GAP-12, taxonomy §3). Rules 40/41/44/61/38.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Plus, LayoutGrid, List as ListIcon, ArrowLeft, Star } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listVendors, deleteVendor } from '../services/procurementService'

export default function VendorListPage({ basePath = '/pm/procurement/vendors' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [vendors, setVendors] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('procurement-vendors', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'vendor_name', direction: 'asc' },
    storageKey: 'procurement-vendors-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const acctId = await getCurrentUserAccountId()
      setAccountId(acctId)
      if (!acctId) return
      setVendors(await listVendors(acctId))
    } catch (err) {
      setLoadError(err?.message || 'Could not load vendors.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter(
      (v) => v.vendor_name?.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q) || v.vendor_code?.toLowerCase().includes(q)
    )
  }, [vendors, search])

  const sortAccessors = useMemo(
    () => ({
      vendor_name: (r) => r.vendor_name || '',
      category: (r) => r.category || '',
      rating_avg: (r) => r.rating_avg ?? -1,
    }),
    []
  )
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'vendor_code', label: 'Code' },
    { key: 'category', label: 'Category' },
    { key: 'contact_email', label: 'Contact email' },
    { key: 'rating_avg', label: 'Avg. rating' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete vendor "${row.vendor_name}"?`)) return
    await deleteVendor(row.id)
    showSuccess({ recordId: row.vendor_name, operation: 'deleted', message: `"${row.vendor_name}" was deleted.` })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading vendors…</div>
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
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
        </div>
        <button onClick={() => navigate(`${basePath}/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Vendor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="VendorRegister" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No vendors yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('vendor_name')} onSort={() => handleSort('vendor_name')} className="!normal-case whitespace-nowrap">Vendor</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category')} onSort={() => handleSort('category')} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Contact</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('rating_avg')} onSort={() => handleSort('rating_avg')} className="!normal-case whitespace-nowrap">Avg. rating</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.vendor_name}
                      {row.is_active === false && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(inactive)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      <div>{row.contact_email ? row.contact_email.split(/\r?\n/).filter(Boolean).join(', ') : '—'}</div>
                      {row.contact_phone ? (
                        <div className="text-xs text-gray-700 dark:text-gray-200">{row.contact_phone.split(/\r?\n/).filter(Boolean).join(', ')}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.rating_avg != null ? (
                        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{row.rating_avg}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View vendor" onClick={() => navigate(`${basePath}/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit vendor" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete vendor" onClick={() => handleDelete(row)} />
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
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.vendor_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{row.category || 'Uncategorised'}</div>
                {row.rating_avg != null && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1"><Star className="h-3 w-3" />{row.rating_avg}</div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View vendor" onClick={() => navigate(`${basePath}/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit vendor" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete vendor" onClick={() => handleDelete(row)} />
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
