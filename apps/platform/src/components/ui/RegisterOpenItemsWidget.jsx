import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table.jsx'

/**
 * Compact, sortable, searchable "worklist" table for a register's Dashboard tab.
 * Generalizes the pattern proven by Issue Register's OpenIssuesWidget so every
 * register can show its 5 most relevant open items below the stat cards without
 * a bespoke table per page.
 *
 * @param {{
 *   title: string,
 *   icon?: React.ComponentType,
 *   rows: any[],
 *   totalCount?: number,
 *   columns: { key: string, label: string, sortAccessor?: (row: any) => any, render?: (row: any) => React.ReactNode, className?: string }[],
 *   rowKey: (row: any) => string,
 *   searchFields?: string[],
 *   onRowClick?: (row: any) => void,
 *   onViewAll?: () => void,
 *   viewAllLabel?: string,
 *   emptyMessage?: string,
 *   loading?: boolean,
 *   storageKey?: string,
 * }} props
 */
export default function RegisterOpenItemsWidget({
  title,
  icon: Icon,
  rows = [],
  totalCount,
  columns,
  rowKey,
  searchFields = [],
  onRowClick,
  onViewAll,
  viewAllLabel,
  emptyMessage = 'No items to show',
  loading = false,
  storageKey,
}) {
  const [search, setSearch] = useState('')
  const total = totalCount ?? rows.length

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || searchFields.length === 0) return rows
    return rows.filter((row) =>
      searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(q))
    )
  }, [rows, search, searchFields])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: storageKey || `register-open-items-${title.toLowerCase().replace(/\s+/g, '-')}`,
    defaultSort: { column: columns[0]?.key, direction: 'asc' },
  })

  const accessors = useMemo(() => {
    const map = {}
    columns.forEach((col) => {
      map[col.key] = col.sortAccessor || ((row) => row[col.key] ?? '')
    })
    return map
  }, [columns])

  const displayRows = useMemo(
    () => sortedData(filteredRows, accessors),
    [filteredRows, sortedData, accessors]
  )

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-blue-500" />}
          {title}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {displayRows.length} of {total}
        </span>
      </div>

      {total > 0 && searchFields.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="search"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No items match the current search</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/80">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {columns.map((col) => (
                  <TableHeaderCell
                    key={col.key}
                    sortable
                    sortDirection={getSortDirectionForColumn(col.key)}
                    onSort={() => handleSort(col.key)}
                    className={`!normal-case whitespace-nowrap ${col.headerClassName || ''}`}
                  >
                    {col.label}
                  </TableHeaderCell>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayRows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-3 text-sm ${col.className || 'text-gray-700 dark:text-gray-300 whitespace-nowrap'}`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {typeof onViewAll === 'function' && total > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {viewAllLabel || `Open full ${title}`}
          </button>
        </div>
      )}
    </div>
  )
}
