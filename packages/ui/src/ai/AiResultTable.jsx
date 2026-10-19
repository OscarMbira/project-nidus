/**
 * v1272 — Ask Nidus query result: explanation, sortable table with row numbers, record links,
 * export menu and "Save as report" (PRD stories 13, 15, 16, 17; rules 38, 40, 44, 16.1).
 * Theme-aware. Shared by Platform, Simulator and Planner.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Save } from 'lucide-react'
import ExportListMenu from '../ExportListMenu.jsx'
import { TableRowNumberHeader, TableRowNumberCell } from '../Table.jsx'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { sortRowsByColumn } from '@nidus/shared/hooks/useSortableTable'
import { recordLink } from '@nidus/shared/services/askNidusService'

function formatCell(value, type) {
  if (value == null || value === '') return '—'
  if (type === 'boolean') return value ? 'Yes' : 'No'
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)
  }
  if (type === 'date') return String(value).slice(0, 10)
  if (type === 'datetime') return String(value).replace('T', ' ').slice(0, 16)
  return String(value)
}

export default function AiResultTable({ result, basePath = '', linksEnabled = true, compact = false, onSaveReport = null }) {
  const [sort, setSort] = useState({ column: null, direction: null })
  const columns = useMemo(() => result?.columns || [], [result])
  const rows = useMemo(() => {
    const accessors = Object.fromEntries(columns.map((c) => [c.key, (r) => r[c.key]]))
    return sortRowsByColumn(result?.rows || [], sort.column, sort.direction, accessors, { column: null, direction: null })
  }, [result, columns, sort])

  if (!result) return null
  const visibleRows = compact ? rows.slice(0, 8) : rows
  const firstKey = columns[0]?.key

  const cycleSort = (key) => {
    setSort((s) => {
      if (s.column !== key) return { column: key, direction: 'asc' }
      if (s.direction === 'asc') return { column: key, direction: 'desc' }
      return { column: null, direction: null }
    })
  }

  const exportColumns = columns.map((c) => ({ key: c.key, label: c.label }))
  const exportRows = rows.map((r) => Object.fromEntries(columns.map((c) => [c.key, formatCell(r[c.key], c.type)])))

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>
            <span className="font-medium text-gray-800 dark:text-gray-100">What I looked up: </span>
            {result.explanation}
            {result.truncated ? ` — showing ${result.row_count} of ${result.total_count}` : ` — ${result.total_count} result${result.total_count === 1 ? '' : 's'}`}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {onSaveReport && (
            <button
              type="button"
              onClick={() => onSaveReport(result)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save as report
            </button>
          )}
          {!compact && rows.length > 0 && (
            <ExportListMenu columns={exportColumns} data={exportRows} baseFilename={result.entity_label || 'Ask Nidus results'} />
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No matching records.</p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader />
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    onClick={() => cycleSort(c.key)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), cycleSort(c.key))}
                    tabIndex={0}
                    aria-sort={sort.column === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    {c.label}{' '}
                    <span aria-hidden="true">{sort.column === c.key ? (sort.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleRows.map((row, index) => {
                const href = linksEnabled && result.mode !== 'grouped' ? recordLink(basePath, result.route_template, row) : null
                return (
                  <tr key={row.__id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    {columns.map((c) => {
                      const text = formatCell(row[c.key], c.type)
                      const isLinkCell = href && c.key === firstKey
                      return (
                        <td key={c.key} className="whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100">
                          {isLinkCell ? (
                            <Link to={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{text}</Link>
                          ) : text}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {compact && rows.length > visibleRows.length && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              {rows.length - visibleRows.length} more row(s) — open in the workspace to see all and export.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
