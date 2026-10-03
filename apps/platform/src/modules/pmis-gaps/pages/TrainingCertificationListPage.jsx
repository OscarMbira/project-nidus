/**
 * Training Tracker (GAP-20) — certification catalog list. v963 Phase 14.
 * Admin-managed reference data (not project-scoped). Replaces the read-only
 * createGapListPage() stub with real CRUD (rule 65).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, GraduationCap } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import RowActionButton from '../../../components/ui/RowActionButton'
import RowNumberBadge from '../../../components/ui/RowNumberBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listCertifications } from '../services/trainingService'

const PAGE_SIZE = 20

export default function TrainingCertificationListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('pmis-training-certifications', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'certification_name', direction: 'asc' },
    storageKey: 'pmis-training-certifications-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listCertifications()
      if (!cancelled) {
        setRows(result.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.certification_name || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    certification_name: (r) => r.certification_name || '',
    issuing_body: (r) => r.issuing_body || '',
    validity_months: (r) => r.validity_months || 0,
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'certification_name', label: 'Certification' },
    { key: 'issuing_body', label: 'Issuing body' },
    { key: 'validity_months', label: 'Validity (months)' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certification Catalog</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={sorted} baseFilename="certification-catalog" disabled={sorted.length === 0} />
          <button type="button" onClick={() => navigate('create')} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" />
            New Certification
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search certifications…" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
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
          No certifications in the catalog yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('certification_name')} onSort={() => handleSort('certification_name')} className="!normal-case whitespace-nowrap">Certification</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('issuing_body')} onSort={() => handleSort('issuing_body')} className="!normal-case whitespace-nowrap">Issuing body</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('validity_months')} onSort={() => handleSort('validity_months')} className="!normal-case whitespace-nowrap">Validity</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.certification_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.issuing_body || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.validity_months ? `${row.validity_months} months` : 'No expiry'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View certification" onClick={() => navigate(`${row.id}`)} />
                      <RowActionButton variant="edit" label="Edit certification" onClick={() => navigate(`${row.id}/edit`)} />
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
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{row.certification_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.issuing_body || '—'} · {row.validity_months ? `${row.validity_months} months` : 'No expiry'}</p>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View certification" onClick={() => navigate(`${row.id}`)} />
                <RowActionButton variant="edit" label="Edit certification" onClick={() => navigate(`${row.id}/edit`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
