/**
 * Vendor performance ratings, across all vendors (Procurement, GAP-12, taxonomy §3). Rules
 * 40/41/44/61/38.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Plus, LayoutGrid, List as ListIcon, ArrowLeft } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listVendorRatings, deleteVendorRating } from '../services/procurementService'

const formatRatingDate = (value) => (value ? new Date(value).toLocaleDateString() : '—')

export default function VendorPerformanceListPage({ basePath = '/pm/procurement/performance' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [ratings, setRatings] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('procurement-vendor-performance', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'procurement-vendor-performance-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const acctId = await getCurrentUserAccountId()
    setAccountId(acctId)
    if (!acctId) {
      setLoading(false)
      return
    }
    setRatings(await listVendorRatings(acctId))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ratings
    return ratings.filter((r) => r.vendor_name?.toLowerCase().includes(q) || r.rating_notes?.toLowerCase().includes(q))
  }, [ratings, search])

  const sortAccessors = useMemo(
    () => ({
      vendor_name: (r) => r.vendor_name || '',
      rating_score: (r) => r.rating_score || 0,
      created_at: (r) => r.created_at || '',
    }),
    []
  )
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'rating_score', label: 'Score (1-5)' },
    { key: 'rating_notes', label: 'Notes' },
    { key: 'created_at', label: 'Rated on' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this rating for "${row.vendor_name}"?`)) return
    await deleteVendorRating(row.id, row.vendor_id)
    showSuccess({ recordId: row.vendor_name, operation: 'deleted', message: `Rating for "${row.vendor_name}" was deleted.` })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading vendor performance…</div>
  }
  if (!accountId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Could not resolve your organisation.</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Performance</h1>
        </div>
        <button onClick={() => navigate(`${basePath}/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Rate a Vendor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ratings..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="VendorPerformance" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No vendor ratings yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('vendor_name')} onSort={() => handleSort('vendor_name')} className="!normal-case whitespace-nowrap">Vendor</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('rating_score')} onSort={() => handleSort('rating_score')} className="!normal-case whitespace-nowrap">Score</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Notes</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('created_at')} onSort={() => handleSort('created_at')} className="!normal-case whitespace-nowrap">Rated on</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.vendor_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{row.rating_score}/5</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{row.rating_notes || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatRatingDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="edit" label="Edit rating" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete rating" onClick={() => handleDelete(row)} />
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
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.vendor_name || '—'}</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1"><Star className="h-3 w-3" />{row.rating_score}/5</div>
                {row.rating_notes && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{row.rating_notes}</div>}
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="edit" label="Edit rating" onClick={() => navigate(`${basePath}/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete rating" onClick={() => handleDelete(row)} />
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
