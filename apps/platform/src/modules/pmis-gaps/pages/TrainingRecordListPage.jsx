/**
 * Training Tracker (GAP-20) — member training record list (the current user's own
 * records; RLS also restricts to own rows / PMO admin). v963 Phase 14.
 * Expiry flagging reuses the existing RagStatusBadge red/amber/green pattern.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ClipboardCheck } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import RowActionButton from '../../../components/ui/RowActionButton'
import RowNumberBadge from '../../../components/ui/RowNumberBadge'
import RagStatusBadge from '../../../components/ui/RagStatusBadge'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listMemberTrainingRecords, getExpiryStatus } from '../services/trainingService'

const PAGE_SIZE = 20
const EXPIRY_RAG = { expired: 'red', expiring_soon: 'amber', valid: 'green' }
const EXPIRY_LABEL = { expired: 'Expired', expiring_soon: 'Expiring soon', valid: 'Valid' }

export default function TrainingRecordListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('pmis-training-records', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'title', direction: 'asc' },
    storageKey: 'pmis-training-records-sort',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listMemberTrainingRecords()
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
    return rows.filter((r) => (r.title || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    title: (r) => r.title || '',
    completion_status: (r) => r.completion_status || '',
    expiry_date: (r) => r.expiry_date || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'record_type', label: 'Type' },
    { key: 'completion_status', label: 'Status' },
    { key: 'expiry_date', label: 'Expiry' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Training Records</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={sorted} baseFilename="training-records" disabled={sorted.length === 0} />
          <button type="button" onClick={() => navigate('create')} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" />
            New Record
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search records…" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
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
          No training records yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')} className="!normal-case whitespace-nowrap">Title</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Type</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('completion_status')} onSort={() => handleSort('completion_status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('expiry_date')} onSort={() => handleSort('expiry_date')} className="!normal-case whitespace-nowrap">Expiry</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => {
                const expiry = getExpiryStatus(row.expiry_date)
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.record_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.completion_status?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.expiry_date ? (
                        <span className="inline-flex items-center gap-2">
                          {new Date(row.expiry_date).toLocaleDateString()}
                          <RagStatusBadge rag={EXPIRY_RAG[expiry]} showLabel={false} />
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                      <div className="inline-flex items-center gap-3 justify-end">
                        <RowActionButton variant="view" label="View record" onClick={() => navigate(`${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit record" onClick={() => navigate(`${row.id}/edit`)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((row, index) => {
            const expiry = getExpiryStatus(row.expiry_date)
            return (
              <div key={row.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-start justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  {row.expiry_date && <RagStatusBadge rag={EXPIRY_RAG[expiry]} showLabel />}
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">{row.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{row.record_type?.replace(/_/g, ' ')} · {row.completion_status?.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-3 pt-2">
                  <RowActionButton variant="view" label="View record" onClick={() => navigate(`${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit record" onClick={() => navigate(`${row.id}/edit`)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
