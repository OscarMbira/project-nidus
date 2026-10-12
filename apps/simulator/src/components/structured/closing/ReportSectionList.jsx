import { useMemo, useState } from 'react'
import ViewToggle from '@nidus/ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

function cellText(value) {
  if (value == null || value === '') return ''
  return String(value)
}

function columnText(row, column) {
  return cellText(column.value ? column.value(row) : row[column.key])
}

function sortRows(rows, columns, sort) {
  const primary = columns[0]
  const copy = [...rows]
  if (!primary) return copy
  copy.sort((a, b) => {
    const column = sort.key ? columns.find((item) => item.key === sort.key) || primary : primary
    const result = columnText(a, column).localeCompare(columnText(b, column), undefined, { sensitivity: 'base' })
    if (result !== 0) {
      if (!sort.key) return result
      return sort.direction === 'desc' ? -result : result
    }
    return cellText(a.created_at).localeCompare(cellText(b.created_at))
  })
  return copy
}

export default function ReportSectionList({
  viewModeId,
  title,
  rows = [],
  columns,
  emptyText = 'No records yet.',
  heading = 'h2',
}) {
  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const [sort, setSort] = useState({ key: null, direction: null })
  const sorted = useMemo(() => sortRows(rows, columns, sort), [rows, columns, sort])
  const Heading = heading

  const cycleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key || !prev.direction) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return { key: null, direction: null }
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        {title ? (
          <Heading className="text-xl font-bold text-gray-900 dark:text-white">{title}</Heading>
        ) : <span />}
        <div className="flex items-center gap-2 self-end">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel={`${title || 'Records'} layout`} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">{emptyText}</p>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                {columns.map((column) => (
                  <TableHeaderCell
                    key={column.key}
                    sortable
                    sortDirection={sort.key === column.key ? sort.direction : null}
                    onSort={() => cycleSort(column.key)}
                  >
                    {column.label}
                  </TableHeaderCell>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {sorted.map((row, index) => (
                <tr key={row.id || index}>
                  <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-normal">
                      {columnText(row, column) || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((row, index) => (
            <div key={row.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="mb-2"><RowNumberBadge number={getDisplayRowNumber(index)} /></div>
              <dl className="space-y-2">
                {columns.map((column) => (
                  <div key={column.key}>
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{column.label}</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">{columnText(row, column) || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
