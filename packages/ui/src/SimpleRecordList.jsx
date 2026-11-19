/**
 * v1343 — a small read-only list page body built from the shared pieces, for simple record lists
 * (My Approvals tabs, Meeting follow-ups, Approvals History). Follows the list rules:
 * search (rule 41), Table-List by default with a Card toggle (41), # row numbers in both views
 * (44), clickable sortable headers unsorted → asc → desc (40), default order A→Z on the main
 * label then oldest first (40.1), export menu (38), light / dark (28.1).
 *
 * @param {{
 *   pageId: string,                       view-mode and sort memory key
 *   columns: Array<{ key: string, label: string, render?: (row) => any, sortValue?: (row) => any, primary?: boolean }>,
 *   rows: object[],
 *   loading?: boolean, error?: string, emptyText?: string,
 *   searchPlaceholder?: string,
 *   exportBaseName?: string,
 *   onRowClick?: (row) => void,
 *   rowKey?: (row) => string,
 * }} props
 */
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table'
import ViewToggle from './ViewToggle'
import RowNumberBadge from './RowNumberBadge'
import ExportListMenu from './ExportListMenu'

const text = (v) => (v == null ? '' : String(v))

export default function SimpleRecordList({
  pageId,
  columns = [],
  rows = [],
  loading = false,
  error = '',
  emptyText = 'Nothing to show.',
  searchPlaceholder = 'Search…',
  exportBaseName = 'Export',
  onRowClick,
  rowKey = (r) => r.id,
}) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useViewMode(pageId, 'list')
  const primary = columns.find((c) => c.primary) || columns[0]
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: `${pageId}-sort`,
    defaultSort: { column: primary?.key, direction: 'asc' },
  })

  const valueOf = (col, row) => (col.sortValue ? col.sortValue(row) : row[col.key])
  const accessors = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, (row) => valueOf(c, row)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? rows.filter((r) => columns.some((c) => text(valueOf(c, r)).toLowerCase().includes(q)))
      : rows
    // Rule 40.1 tie-breaker: oldest first, then the sort (stable) on the chosen / main column.
    const byCreated = [...matched].sort((a, b) => text(a.created_at).localeCompare(text(b.created_at)))
    return sortedData(byCreated, accessors)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columns, accessors, sortedData])

  const exportColumns = useMemo(() => columns.map((c) => ({ key: c.key, label: c.label })), [columns])
  const exportRows = useMemo(
    () => visible.map((r) => Object.fromEntries(columns.map((c) => [c.key, text(valueOf(c, r))]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, columns],
  )

  const cell = (col, row) => (col.render ? col.render(row) : text(row[col.key]) || '—')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ExportListMenu columns={exportColumns} data={exportRows} baseFilename={exportBaseName} disabled={!exportRows.length} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">{query ? 'No matches.' : emptyText}</p>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((row, index) => (
            <div
              key={rowKey(row)}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
              className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${onRowClick ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{cell(primary, row)}</span>
                <RowNumberBadge number={getDisplayRowNumber(index)} />
              </div>
              <dl className="space-y-1 text-sm">
                {columns.filter((c) => c !== primary).map((c) => (
                  <div key={c.key} className="flex gap-2">
                    <dt className="text-gray-500 dark:text-gray-400 min-w-[7rem]">{c.label}</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{cell(c, row)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <TableRowNumberHeader />
                {columns.map((c) => (
                  <TableHeaderCell
                    key={c.key}
                    sortable
                    sortDirection={getSortDirectionForColumn(c.key)}
                    onSort={() => handleSort(c.key)}
                  >
                    {c.label}
                  </TableHeaderCell>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {visible.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`text-gray-800 dark:text-gray-200 ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60' : ''}`}
                >
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 align-top">{cell(c, row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
