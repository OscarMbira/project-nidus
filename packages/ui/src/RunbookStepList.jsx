import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRegionalDateTime } from '@nidus/shared/utils/registerDateTime'
import { formatListCell } from '@nidus/shared/utils/registerListColumns'
import { orderSteps } from '@nidus/shared/utils/runbookSummary'

const STATUS_CLASS = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  blocked: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  skipped: 'bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-400',
}

/**
 * Column width in rem by field type (presentation only; which columns and their headings come from
 * the DB). Columns up to and including the step title are pinned on the left (`pinned`).
 */
// Compact minimums: the table fills the available width (extra space is shared out), and 15 columns
// fit without scrolling on a wide screen with the sidebar hidden (~1650px); narrower screens scroll.
const widthFor = (c, pinned) => {
  if (c.key === 'title') return 14
  if (c.key === 'status') return 6
  switch (c.field?.field_type) {
    case 'datetime': return 9.5
    case 'dropdown': return 8
    case 'boolean': return 5
    case 'number': case 'currency': return pinned ? 3 : 6
    default: return 8
  }
}
/** Widths plus the left offset of each pinned column. */
const layoutColumns = (cols) => {
  const titleAt = cols.findIndex((c) => c.key === 'title')
  let left = 0
  return cols.map((c, i) => {
    const pinned = i <= titleAt
    const width = widthFor(c, pinned)
    const out = { ...c, width, pinned, left, lastPinned: i === titleAt }
    left += width
    return out
  })
}
/** Optional DB rule on a column: { field, gt } → highlight the cell when that value is above gt. */
const warns = (c, fv) => {
  const w = c.config?.warn_when
  return Boolean(w?.field) && Number(fv[w.field]) > Number(w.gt ?? 0)
}

/**
 * Ordered runbook steps grouped by window and batch (v1337, story 17). Each row links to the step.
 * @param {object[]} props.steps            Runbook Steps records
 * @param {(id: string) => string} props.hrefFor
 * @param {Record<string,string>} [props.statusLabels]
 * @param {Record<string,string>} [props.windowLabels]
 * @param {Record<string,string>} [props.batchLabels]
 * @param {object[]} props.columns   from resolveListColumns(stepsRegister) — register.behaviour.list_columns (v1381)
 * @param {object} [props.settings]  resolved regional settings (date / time format, time zone)
 */
export default function RunbookStepList({ steps, hrefFor, statusLabels = {}, windowLabels = {}, batchLabels = {}, columns = [], settings, formatNumber = (n) => Number(n).toLocaleString() }) {
  const [query, setQuery] = useState('')
  const [activeKey, setActiveKey] = useState(null)
  // Without configured columns, still list each step (linked title) so the runbook stays usable.
  const cols = layoutColumns(columns.length ? columns : [{ key: 'title', label: '', field: null }])
  const tableRem = cols.reduce((t, c) => t + c.width, 0)
  // Pinned (left) cells need an opaque background and a divider so scrolled cells pass underneath.
  const pinStyle = (c) => (c.pinned ? { position: 'sticky', left: `${c.left}rem` } : undefined)
  const pinClass = (c) => (c.pinned ? `bg-white dark:bg-gray-900 ${c.lastPinned ? 'border-r border-gray-200 dark:border-gray-700' : ''}` : '')
  const fmt = { formatNumber, formatDateTime: (v) => formatRegionalDateTime(v, settings) }
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = []
    for (const s of orderSteps(steps)) {
      const fv = s.field_values || {}
      if (q && !`${fv.sequence} ${s.title} ${s.display_id || ''} ${fv.data_set || ''}`.toLowerCase().includes(q)) continue
      const key = `${fv.window || ''}|${fv.batch || ''}`
      let g = out.find((x) => x.key === key)
      if (!g) {
        g = { key, title: [windowLabels[fv.window] || fv.window, batchLabels[fv.batch] || fv.batch].filter(Boolean).join(' · ') || 'Other steps', steps: [] }
        out.push(g)
      }
      g.steps.push(s)
    }
    return out
  }, [steps, query, windowLabels, batchLabels])
  // One tab per window · batch; keep the chosen tab while it still has steps, else the first.
  const active = groups.find((g) => g.key === activeKey) || groups[0]

  return (
    <section aria-label="Runbook steps" className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Steps</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search steps"
          aria-label="Search steps"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 sm:w-64 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      {groups.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{steps?.length ? 'No steps match.' : 'No steps yet. Add them in Runbook Steps, or create this runbook from a template.'}</p>}
      {groups.length > 0 && (
        <div role="tablist" aria-label="Step groups" className="mb-3 flex flex-wrap gap-1.5">
          {groups.map((g) => {
            const on = g.key === active.key
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveKey(g.key)}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${on
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                {g.title}
                <span className={`ml-1.5 rounded-full px-1.5 text-xs ${on ? 'bg-white/20' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{g.steps.length}</span>
              </button>
            )
          })}
        </div>
      )}
      <div>
        {groups.filter((g) => g.key === active?.key).map((g) => (
          <div key={g.key} role="tabpanel" aria-label={g.title}>
            {/* Own scroll box, sized to the screen: the left-right scrollbar is always in view, the
                headings stay at the top and the step columns stay on the left while scrolling. */}
            <div
              className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700"
              tabIndex={0}
              aria-label={`${g.title} steps table`}
            >
              {/* Fixed layout + shared column widths so every group's columns line up. */}
              <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: `${tableRem}rem` }}>
                <colgroup>
                  {cols.map((c) => <col key={c.key} style={{ width: `${c.width}rem` }} />)}
                </colgroup>
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        style={{ position: 'sticky', top: 0, ...(c.pinned ? { left: `${c.left}rem` } : {}) }}
                        className={`whitespace-normal break-normal border-b border-gray-200 bg-white py-2 pl-2 pr-3 align-bottom font-medium leading-tight dark:border-gray-700 dark:bg-gray-900 ${c.pinned ? 'z-20' : 'z-10'} ${c.lastPinned ? 'border-r' : ''} ${c.numeric ? 'text-right' : ''}`}
                        title={c.label}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.steps.map((s) => {
                    const fv = s.field_values || {}
                    const cell = (c) => {
                      if (c.key === 'title') {
                        return (
                          <>
                            <Link to={hrefFor(s.id)} className="text-blue-600 hover:underline dark:text-blue-400">{s.title}</Link>
                            {fv.can_run_in_parallel && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">parallel</span>}
                          </>
                        )
                      }
                      if (c.key === 'status') {
                        return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s.status] || STATUS_CLASS.not_started}`}>{statusLabels[s.status] || s.status}</span>
                      }
                      return formatListCell(c, fv[c.key], fmt) || '—'
                    }
                    return (
                      <tr key={s.id}>
                        {cols.map((c) => (
                          <td
                            key={c.key}
                            title={c.key === 'title' ? s.title : undefined}
                            style={pinStyle(c)}
                            className={`truncate border-b border-gray-100 py-1.5 pl-2 pr-3 dark:border-gray-800 ${c.pinned ? 'z-[5]' : ''} ${pinClass(c)} ${c.numeric ? 'text-right tabular-nums' : ''} ${warns(c, fv) ? 'text-red-600 dark:text-red-400' : c.key === 'title' || c.key === 'status' ? '' : 'text-gray-700 dark:text-gray-300'}`}
                          >
                            {cell(c)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
