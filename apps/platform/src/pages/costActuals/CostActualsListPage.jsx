/**
 * Cost Actuals Ledger — list page (v963 Phase 6). Standard pattern: dedicated routed pages (rule
 * 65), sortable Table-List + Card toggle with row numbers (rules 40/41/44), export menu (rule
 * 38), theme-aware (rule 28.1). Project context via usePlatformProjectId() (rule 16.1).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List as ListIcon, Receipt } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { listCostActuals } from '../../services/costActualsService'

const PAGE_SIZE = 20

const TYPE_LABELS = { actual: 'Actual', commitment: 'Commitment', accrual: 'Accrual' }
const TYPE_BADGE = {
  actual: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  commitment: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  accrual: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
}

function formatCurrency(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[type] || TYPE_BADGE.actual}`}>
      {TYPE_LABELS[type] || type}
    </span>
  )
}

export default function CostActualsListPage() {
  const { projectId, routeKey, loading: projectLoading } = usePlatformProjectId()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('platform-cost-actuals-page', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'transaction_date', direction: 'desc' },
    storageKey: 'nidus-cost-actuals-sort',
  })

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listCostActuals(projectId, { transactionType: typeFilter || undefined })
      if (!cancelled) {
        setRows(result.data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, typeFilter])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.description || '').toLowerCase().includes(term) || (r.category || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    transaction_date: (r) => r.transaction_date || '',
    transaction_type: (r) => r.transaction_type || '',
    amount: (r) => Number(r.amount) || 0,
    category: (r) => r.category || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const total = sorted.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const exportColumns = [
    { key: 'transaction_date', label: 'Date' },
    { key: 'transaction_type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'description', label: 'Description' },
  ]
  const exportRows = sorted.map((r) => ({
    transaction_date: r.transaction_date,
    transaction_type: TYPE_LABELS[r.transaction_type] || r.transaction_type,
    category: r.category || '',
    amount: r.amount,
    description: r.description || '',
  }))

  if (projectLoading || loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading cost actuals…</div>
  }
  if (!projectId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Select a project to view its Cost Actuals ledger.</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-500" />
            Cost Actuals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Transaction ledger of actual costs, commitments and accruals against this project's budget.
            Total shown: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename="cost-actuals" disabled={exportRows.length === 0} />
          <button
            type="button"
            onClick={() => navigate(`/platform/cost-actuals/create${projectSuffix}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Entry
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
            placeholder="Search description or category…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="">All types</option>
          <option value="actual">Actual</option>
          <option value="commitment">Commitment</option>
          <option value="accrual">Accrual</option>
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
          No cost actuals recorded yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('transaction_date')} onSort={() => handleSort('transaction_date')} className="!normal-case whitespace-nowrap">
                  Date
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('transaction_type')} onSort={() => handleSort('transaction_type')} className="!normal-case whitespace-nowrap">
                  Type
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category')} onSort={() => handleSort('category')} className="!normal-case whitespace-nowrap">
                  Category
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('amount')} onSort={() => handleSort('amount')} className="!normal-case whitespace-nowrap">
                  Amount
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">
                  Description
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((r, index) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm"><TypeBadge type={r.transaction_type} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-md truncate">{r.description || '—'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton variant="view" label="View cost actual" onClick={() => navigate(`/platform/cost-actuals/${r.id}${projectSuffix}`)} />
                      <RowActionButton variant="edit" label="Edit cost actual" onClick={() => navigate(`/platform/cost-actuals/${r.id}/edit${projectSuffix}`)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((r, index) => (
            <div key={r.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <TypeBadge type={r.transaction_type} />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(r.amount)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{r.category || 'Uncategorised'} · {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '—'}</p>
              {r.description && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{r.description}</p>}
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton variant="view" label="View cost actual" onClick={() => navigate(`/platform/cost-actuals/${r.id}${projectSuffix}`)} />
                <RowActionButton variant="edit" label="Edit cost actual" onClick={() => navigate(`/platform/cost-actuals/${r.id}/edit${projectSuffix}`)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
