/**
 * v1239 Slice 3 — the one list layout the schedule screens share (rules 38, 40, 40.1, 41, 44, 61):
 * search, sortable headers, Table-List ≡ (default) / Card ⊞ toggle, `#` row numbers in both
 * views, export menu, and a per-row actions slot for icon-only View/Edit/Delete buttons.
 *
 * columns: [{ key, label, value?: (row) => sortable/exportable value, render?: (row) => node, sortable? }]
 * The first column is the primary label: default order is that label A→Z, then created_at.
 */
import { useMemo, useState } from 'react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { ExportListMenu } from '@nidus/ui'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'

const valueOf = (col, row) => (col.value ? col.value(row) : row[col.key])
const textOf = (v) => (v === null || v === undefined ? '' : String(v))

export function defaultOrder(rows, primary) {
  return [...rows].sort((a, b) => {
    const byLabel = textOf(valueOf(primary, a)).localeCompare(textOf(valueOf(primary, b)), undefined, { sensitivity: 'base' })
    if (byLabel !== 0) return byLabel
    return textOf(a.created_at).localeCompare(textOf(b.created_at))
  })
}

export default function PlanningTable({
  pageId,
  columns,
  rows,
  actions = null,
  emptyText = 'Nothing to show yet.',
  exportName = 'Export',
  searchPlaceholder = 'Search…',
  toolbar = null,
  keepOrder = false,
  rowClassName = null,
}) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode(pageId, 'list')
  const primary = columns[0]
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: primary.key, direction: 'asc' },
    storageKey: `${pageId}-sort`,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q ? rows : rows.filter((row) => columns.some((c) => textOf(valueOf(c, row)).toLowerCase().includes(q)))
    // Screens whose order carries meaning (timeline order) pass keepOrder.
    return keepOrder ? list : defaultOrder(list, primary)
  }, [rows, search, columns, primary, keepOrder])

  const accessors = useMemo(
    () => Object.fromEntries(columns.filter((c) => c.sortable !== false).map((c) => [c.key, (row) => valueOf(c, row) ?? ''])),
    [columns]
  )
  const sorted = sortedData(filtered, accessors)
  const exportRows = useMemo(
    () => sorted.map((row) => Object.fromEntries(columns.map((c) => [c.key, valueOf(c, row) ?? '']))),
    [sorted, columns]
  )
  const cell = (c, row) => (c.render ? c.render(row) : textOf(valueOf(c, row)) || '—')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <ExportListMenu columns={columns.map((c) => ({ key: c.key, label: c.label }))} data={exportRows} baseFilename={exportName} />
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel={`${exportName} layout`} />
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-600 dark:text-gray-300">{rows.length ? 'No matches for this search.' : emptyText}</div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                {columns.map((c) => (
                  <TableHeaderCell
                    key={c.key}
                    sortable={c.sortable !== false}
                    sortDirection={getSortDirectionForColumn(c.key)}
                    onSort={() => handleSort(c.key)}
                  >
                    {c.label}
                  </TableHeaderCell>
                ))}
                {actions && <TableHeaderCell sortable={false} className="text-right">Actions</TableHeaderCell>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {sorted.map((row, index) => (
                <tr key={row.id} className={rowClassName ? rowClassName(row) : ''}>
                  <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{cell(c, row)}</td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((row, index) => (
            <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{cell(primary, row)}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {columns.slice(1).map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-gray-500 dark:text-gray-400">{c.label}</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{cell(c, row)}</dd>
                  </div>
                ))}
              </dl>
              {actions && <div className="flex items-center gap-1 pt-1">{actions(row)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
