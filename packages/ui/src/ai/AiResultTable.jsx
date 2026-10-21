/**
 * v1272 — Ask Nidus query result: explanation, sortable table with row numbers, record links,
 * export menu and "Save as report" (PRD stories 13, 15, 16, 17; rules 38, 40, 44, 16.1).
 * Theme-aware. Shared by Platform, Simulator and Planner.
 *
 * v1295: a grouped row (e.g. "Velocity Freight · high · 6") can be clicked to list the records
 * behind it underneath the table — each linking to its record — with an "Open register" link to the
 * register's list page. Same filters and project limits as the answer; no AI call.
 */
import { useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Info, Loader2, Save, X } from 'lucide-react'
import ExportListMenu from '../ExportListMenu.jsx'
import { TableRowNumberHeader, TableRowNumberCell } from '../Table.jsx'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { sortRowsByColumn } from '@nidus/shared/hooks/useSortableTable'
import AppConfigContext from '@nidus/shared/context/AppConfigContext'
import { drillIntoGroup, drillSpec, recordLink, registerLink } from '@nidus/shared/services/askNidusService'

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

export default function AiResultTable({ result, basePath = '', linksEnabled = true, compact = false, onSaveReport = null, allowDrill = true }) {
  const db = useContext(AppConfigContext)?.db || null // no app config (e.g. a test) → no drill-down
  const [sort, setSort] = useState({ column: null, direction: null })
  const [drill, setDrill] = useState(null) // { key, label, loading, error, result }
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

  const canDrill = allowDrill && !!db && result.mode === 'grouped' && !!result.spec?.entity
  const groupColumns = columns.filter((c) => !c.aggregate)

  const openDrill = async (row, key) => {
    if (drill?.key === key) { setDrill(null); return }
    const label = groupColumns.map((c) => formatCell(row[c.key], c.type)).join(' · ')
    if (!drillSpec(result, row)) return
    setDrill({ key, label, loading: true })
    try {
      const records = await drillIntoGroup(db, result, row)
      setDrill((d) => (d?.key === key ? { key, label, result: records } : d))
    } catch (e) {
      setDrill((d) => (d?.key === key ? { key, label, error: e?.message || 'Could not open these records.' } : d))
    }
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
                const rowKey = row.__id || `g${groupColumns.map((c) => String(row[c.key])).join('|')}`
                const drillProps = canDrill ? {
                  onClick: () => openDrill(row, rowKey),
                  onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDrill(row, rowKey)),
                  tabIndex: 0,
                  role: 'button',
                  'aria-expanded': drill?.key === rowKey,
                  title: 'Show these records',
                } : {}
                return (
                  <tr key={rowKey || index} {...drillProps}
                    className={`${canDrill ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500' : ''} ${drill?.key === rowKey ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    {columns.map((c) => {
                      const text = formatCell(row[c.key], c.type)
                      const isLinkCell = href && c.key === firstKey
                      return (
                        <td key={c.key} className="whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100">
                          {isLinkCell ? (
                            <Link to={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{text}</Link>
                          ) : canDrill && c.key === firstKey ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">{text}</span>
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
      {canDrill && !drill && rows.length > 0 && (
        <p className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">Click a row to see its records.</p>
      )}
      {drill && <DrillPanel drill={drill} basePath={basePath} linksEnabled={linksEnabled} compact={compact} onClose={() => setDrill(null)} />}
    </div>
  )
}

/** v1295: the records behind one grouped row, with a link to the register's list page. */
function DrillPanel({ drill, basePath, linksEnabled, compact, onClose }) {
  const records = drill.result
  const listHref = linksEnabled && records ? registerLink(basePath, records.list_route, records.rows) : null
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950" role="region" aria-label={`Records for ${drill.label}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {records ? `${records.total_count} ${String(records.entity_label || 'records').toLowerCase()}` : 'Records'} — {drill.label}
        </p>
        <div className="flex items-center gap-2">
          {listHref && (
            <Link to={listHref} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700">
              Open {records.entity_label || 'register'} <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100" aria-label="Close records" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {drill.loading && (
        <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading records…</p>
      )}
      {drill.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{drill.error}</p>}
      {records && <AiResultTable result={records} basePath={basePath} linksEnabled={linksEnabled} compact={compact} allowDrill={false} />}
    </div>
  )
}
