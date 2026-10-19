/**
 * v1265 S1 — Plan sheet: a desktop-style plan view. Task table (outline numbers, indent,
 * summary rows, collapse / expand, optional project summary row) on the left, Gantt bars on
 * the right, rows lined up. Read-only in S1; S5 adds editing in the table.
 *
 * props: tasks (DB rows), dependencies (DB rows), team ([{ id, name }]), calendar (engine
 *        calendar), projectName, projectKey (remembers collapsed rows per project), formatDate,
 *        onOpen(task)
 * v1265 S2: statusDate (Planned % cut-off), baselines (all, newest first) for the optional
 *        second-baseline bars; Planned % / Actual % / % Deviation columns.
 * v1265: double-click a row to edit its task (onEdit); a single click on the name views it (onOpen,
 *        after a short wait so a double-click is not taken as a view first).
 * v1265: row actions (icon-only, rule 61): onView, onEdit, onAddSubtask (+), onDelete. Columns can be
 *        resized by dragging the edge of a heading (or with ← → on that edge), dragged into a new order or
 *        shown / hidden in the Columns panel, saved per user (planSheetColumns.js, uiPreferences.js).
 * Per-user view choices (outline numbers, project summary, bars, zoom, baseline, divider) are a
 * convenience in localStorage only (PRD D14).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle, StickyNote, Pin, CalendarClock, Plus, Columns3 } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import ScheduleGanttChart, { GANTT_HEADER_H, GANTT_ROW_H } from './ScheduleGanttChart.jsx'
import { buildOutline, withRollUps, projectSummary, formatDuration, linkTextByTask } from '../services/planOutline.js'
import { progressByTask, baselineEntry, formatDeviation, deviationTone, slipSinceOriginal } from '../services/planProgress.js'
import { planSheetColumnCatalog, applyColumnLayout, moveColumn, nudgeColumn, layoutFrom, resizeColumn, clampWidth, PLAN_SHEET_LAYOUT_KEY } from './planSheetColumns.js'
import { loadPreference, readLocalPreference, savePreference } from '../services/uiPreferences.js'
import { ganttRowsFromOutline } from '../services/ganttExport.js'
import GanttExportMenu from './GanttExportMenu.jsx'

const ZOOMS = [{ value: 'day', label: 'Days' }, { value: 'week', label: 'Weeks' }, { value: 'month', label: 'Months' }]
const PREFS_KEY = 'nidus:planSheet:prefs'
const collapsedKey = (k) => `nidus:planSheet:collapsed:${k}`

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* convenience only */ }
}

const DEFAULT_PREFS = { showOutline: true, showProjectSummary: false, showBars: true, zoom: 'week', showBaseline: false, leftPct: 58 }
const TONE = { behind: 'text-red-700 dark:text-red-400', ahead: 'text-green-700 dark:text-green-400', neutral: '' }
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`)

function Indicators({ task }) {
  const pct = Number(task.percentage_complete || 0)
  return (
    <span className="inline-flex items-center gap-1">
      {pct >= 100 && <Check className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="Done" />}
      {task.is_blocked && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-label="Blocked" />}
      {task.task_description && <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Has notes" />}
    </span>
  )
}

function ModeIcon({ task }) {
  if (task.is_summary) return null
  return task.schedule_mode === 'manual'
    ? <Pin className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-label="Manually scheduled" />
    : <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-label="Automatically scheduled" />
}

export default function PlanSheet({ tasks, dependencies = [], team = [], calendar, projectName = 'Project', projectKey = 'default', formatDate = (d) => d || '', onOpen, onView = null, onEdit = null, onAddSubtask = null, onDelete = null, statusDate = null, baselines = [] }) {
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...readJson(PREFS_KEY, {}) }))
  const setPref = (k, v) => setPrefsState((p) => { const next = { ...p, [k]: v }; writeJson(PREFS_KEY, next); return next })
  const [collapsed, setCollapsedState] = useState(() => new Set(readJson(collapsedKey(projectKey), [])))
  const setCollapsed = (next) => { setCollapsedState(next); writeJson(collapsedKey(projectKey), [...next]) }

  const display = useMemo(() => withRollUps(tasks, calendar), [tasks, calendar])
  const rows = useMemo(() => buildOutline(display, { collapsed }), [display, collapsed])
  const visible = rows.filter((r) => r.visible)
  const project = useMemo(() => (prefs.showProjectSummary ? projectSummary(display, calendar, projectName) : null), [prefs.showProjectSummary, display, calendar, projectName])
  const preds = useMemo(() => linkTextByTask(rows, dependencies, 'pred'), [rows, dependencies])
  const succs = useMemo(() => linkTextByTask(rows, dependencies, 'succ'), [rows, dependencies])
  const names = useMemo(() => new Map(team.map((m) => [m.id, m.name])), [team])
  const summaryIds = rows.filter((r) => r.isSummary).map((r) => r.id)
  const [today] = useState(() => new Date().toISOString().slice(0, 10)) // read once (render stays pure)
  const progress = useMemo(() => {
    const lifted = project ? [{ id: project.id }, ...tasks.map((t) => (t.parent_task_id && tasks.some((x) => x.id === t.parent_task_id) ? t : { ...t, parent_task_id: project.id }))] : tasks
    return progressByTask(lifted, { statusDate: statusDate || today, calendar })
  }, [tasks, project, statusDate, today, calendar])
  const hasBaseline = tasks.some((t) => t.baseline_start_date)
  const [compareId, setCompareId] = useState('')
  const compare = baselines.find((b) => b.id === compareId) || null
  const original = baselines.find((b) => b.baseline_number === 0) || null
  const baselineById = useMemo(() => new Map(baselines.map((b) => [b.id, b])), [baselines])

  // Column layout: local copy for an instant first paint, the user's saved copy once loaded.
  const [layout, setLayoutState] = useState(() => readLocalPreference(PLAN_SHEET_LAYOUT_KEY))
  useEffect(() => {
    let cancelled = false
    loadPreference(PLAN_SHEET_LAYOUT_KEY).then((saved) => { if (!cancelled && saved) setLayoutState(saved) })
    return () => { cancelled = true }
  }, [])
  const catalog = useMemo(() => planSheetColumnCatalog(baselines), [baselines])
  const { visible: layoutColumns, all: allColumns } = useMemo(() => applyColumnLayout(catalog, layout), [catalog, layout])
  // Column being resized: its live width while dragging (saved on release).
  const [sizing, setSizing] = useState(null)
  const columns = sizing ? layoutColumns.map((c) => (c.key === sizing.key ? { ...c, width: sizing.width } : c)) : layoutColumns
  // Changes to order / widths keep the user's frozen column; Reset (null) clears everything.
  const setLayout = (next) => {
    const merged = next ? { ...(layout?.freezeUntil ? { freezeUntil: layout.freezeUntil } : {}), ...next } : null
    setLayoutState(merged)
    savePreference(PLAN_SHEET_LAYOUT_KEY, merged)
  }
  // Freeze up to a column (owner request 2026-10-13): it and every column to its left stay put
  // while the table scrolls right. Wider screens only (sm+); phones show few columns anyway.
  const freezeUntil = layout?.freezeUntil || ''
  const setFreeze = (key) => setLayout({ ...layoutFrom(allColumns), freezeUntil: key || undefined })
  const hasActions = Boolean(onView || onEdit || onAddSubtask || onDelete)
  const reorder = (key, beforeKey) => setLayout({ ...layoutFrom(allColumns), order: moveColumn(allColumns.map((c) => c.key), key, beforeKey) })
  const nudge = (key, step) => setLayout({ ...layoutFrom(allColumns), order: nudgeColumn(allColumns.map((c) => c.key), key, step) })
  const toggleColumn = (key) => setLayout(layoutFrom(allColumns.map((c) => (c.key === key && !c.required ? { ...c, hidden: !c.hidden } : c))))
  const [dragKey, setDragKey] = useState(null)
  const [overKey, setOverKey] = useState(null)
  const [showColumns, setShowColumns] = useState(false)
  // Single click on a name views the task; a double-click on the row edits it. The single click
  // waits briefly so that the first click of a double-click does not open the view first.
  const clickTimer = useRef(null)
  useEffect(() => () => clearTimeout(clickTimer.current), [])
  const DOUBLE_CLICK_MS = 250
  const clickName = (task) => {
    clearTimeout(clickTimer.current)
    if (!onEdit) { onOpen?.(task); return }
    clickTimer.current = setTimeout(() => onOpen?.(task), DOUBLE_CLICK_MS)
  }
  // One handler for every row: the row carries its task id (data-task-id).
  const doubleClickRow = (e) => {
    if (!onEdit || e.target.closest('[role="separator"], [data-row-action]')) return
    const task = tasks.find((t) => t.id === e.currentTarget.dataset.taskId)
    if (!task) return
    clearTimeout(clickTimer.current)
    onEdit(task)
  }
  const startResize = (e, col) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = col.width
    let width = startWidth
    const move = (ev) => { width = clampWidth(startWidth + ev.clientX - startX); setSizing({ key: col.key, width }) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setSizing(null)
      if (width !== startWidth) setLayout(resizeColumn(allColumns, col.key, width))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const resizeByKey = (e, col) => {
    const step = e.shiftKey ? 50 : 10
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setLayout(resizeColumn(allColumns, col.key, col.width + (e.key === 'ArrowRight' ? step : -step)))
    }
  }

  const toggle = (id) => {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCollapsed(next)
  }

  // Divider between table and bars (pointer drag; percentage of the sheet width).
  const wrapRef = useRef(null)
  const startDrag = useCallback((e) => {
    e.preventDefault()
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    const move = (ev) => setPref('leftPct', Math.min(85, Math.max(25, ((ev.clientX - box.left) / box.width) * 100)))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  const cell = (col, r, task) => {
    switch (col.key) {
      case 'id': return r ? r.rowNumber : 0
      case 'indicators': return <Indicators task={task} />
      case 'mode': return <ModeIcon task={task} />
      case 'name': {
        const depth = r ? r.depth : -1
        return (
          <span className="flex items-center min-w-0" style={{ paddingLeft: Math.max(0, depth + (project ? 1 : 0)) * 16 }}>
            {r?.isSummary ? (
              <button type="button" onClick={() => toggle(r.id)} aria-expanded={!r.collapsed} aria-label={`${r.collapsed ? 'Expand' : 'Collapse'} ${task.task_name}`}
                className="mr-1 rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">
                {r.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : <span className="mr-1 inline-block w-5" />}
            <button type="button" onClick={() => r && clickName(task)} disabled={!r} title={task.task_name}
              className={`truncate text-left hover:underline ${task.is_summary ? 'font-semibold' : ''} ${task.is_critical_path && !task.is_summary ? 'text-red-700 dark:text-red-400' : ''}`}>
              {prefs.showOutline && r && <span className="mr-1.5 text-gray-500 dark:text-gray-400">{r.outline}</span>}
              {task.task_name}
            </button>
          </span>
        )
      }
      case 'duration': return formatDuration(task.estimated_duration_days)
      case 'start': return formatDate(task.planned_start_date)
      case 'finish': return formatDate(task.planned_end_date || task.planned_start_date)
      case 'predecessors': return r ? preds.get(r.id) || '' : ''
      case 'successors': return r ? succs.get(r.id) || '' : ''
      case 'resources': return names.get(task.assigned_to_user_id) || ''
      case 'planned': return pct(progress.get(task.id)?.planned)
      case 'actual': return pct(progress.get(task.id)?.actual ?? task.percentage_complete)
      case 'deviation': {
        const d = progress.get(task.id)?.deviation
        return <span className={TONE[deviationTone(d)]}>{formatDeviation(d)}</span>
      }
      case 'wbs': return task.wbs_code || ''
      case 'code': return task.task_code || ''
      case 'baselineStart': return formatDate(task.baseline_start_date)
      case 'baselineFinish': return formatDate(task.baseline_end_date)
      case 'actualStart': return formatDate(task.actual_start_date)
      case 'actualFinish': return formatDate(task.actual_end_date)
      case 'float': return task.slack_days === null || task.slack_days === undefined ? '' : formatDuration(task.slack_days)
      case 'critical': return task.is_critical_path ? 'Yes' : ''
      case 'priority': return task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : ''
      case 'slip': {
        const v = r ? slipSinceOriginal(task, original, calendar) : null
        return v === null ? '' : `${v > 0 ? '+' : ''}${formatDuration(v)}`
      }
      default: {
        if (!col.baselineId) return ''
        const e = baselineEntry(baselineById.get(col.baselineId), task)
        if (!e) return ''
        return col.field === 'duration' ? formatDuration(e.duration) : formatDate(e[col.field])
      }
    }
  }

  const ACTION_W = [onView, onEdit, onAddSubtask, onDelete].filter(Boolean).length * 32 + 12
  const frozenCount = freezeUntil ? columns.findIndex((c) => c.key === freezeUntil) + 1 : 0
  const frozenLeft = []
  columns.reduce((left, c, i) => { frozenLeft[i] = left; return left + c.width }, 0)
  /** Sticky cell props for column i (none when it is not frozen). */
  const freezeProps = (i, header, task) => {
    if (i >= frozenCount) return { className: '', style: {} }
    const bg = header ? 'bg-gray-50 dark:bg-gray-900' : task?.is_summary ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'
    const edge = i === frozenCount - 1 ? ' shadow-[2px_0_3px_-1px_rgba(0,0,0,0.15)]' : ''
    return { className: `sm:sticky ${header ? 'z-20' : 'z-10'} ${bg}${edge} `, style: { left: frozenLeft[i] } }
  }
  const tableWidth = columns.reduce((n, c) => n + c.width, 0) + (hasActions ? ACTION_W : 0)
  // Optional second baseline: its dates ride along as compare_* fields for the bars.
  const withCompare = (t) => {
    const e = compare ? baselineEntry(compare, t) : null
    return e ? { ...t, compare_start_date: e.start, compare_end_date: e.finish } : t
  }
  const barTasks = [...(project ? [project] : []), ...visible.map((r) => r.task)].map(withCompare)

  // A plain function (not a component) so rows are not remounted on every render.
  const renderRow = (r, task) => (
    <tr key={r ? r.id : '__project__'} data-task-id={r ? r.id : undefined} onDoubleClick={r ? doubleClickRow : undefined}
      title={r && onEdit ? 'Double-click to edit' : undefined} className={`${r && onEdit ? 'cursor-pointer select-none ' : ''}border-b border-gray-100 dark:border-gray-700/60 ${task.is_summary ? 'bg-gray-50 dark:bg-gray-900/40' : ''} hover:bg-blue-50/60 dark:hover:bg-gray-700/50`} style={{ height: GANTT_ROW_H }}>
      {columns.map((c, i) => (
        <td key={c.key} className={`${freezeProps(i, false, task).className}${c.phone ? '' : 'hidden sm:table-cell '}px-2 whitespace-nowrap overflow-hidden text-sm text-gray-900 dark:text-gray-100 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.key === 'id' ? 'text-gray-500 dark:text-gray-400' : ''} ${task.is_summary && c.key !== 'id' ? 'font-semibold' : ''}`}
          style={{ maxWidth: c.width, ...freezeProps(i, false, task).style }}>
          {cell(c, r, task)}
        </td>
      ))}
      {hasActions && (
        <td className="px-1 text-right whitespace-nowrap" style={{ width: ACTION_W }}>
          {r && (
            <span className="inline-flex items-center gap-0.5" data-row-action>
              {onView && <RowActionButton variant="view" label={`View ${task.task_name}`} onClick={() => onView(task)} />}
              {onEdit && <RowActionButton variant="edit" label={`Edit ${task.task_name}`} onClick={() => onEdit(task)} />}
              {onAddSubtask && (
                <button type="button" onClick={() => onAddSubtask(task)} title={`Add a sub-task under ${task.task_name}`} aria-label={`Add a sub-task under ${task.task_name}`}
                  className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700">
                  <Plus className="h-4 w-4" />
                </button>
              )}
              {onDelete && <RowActionButton variant="delete" label={`Delete ${task.task_name}`} onClick={() => onDelete(task)} />}
            </span>
          )}
        </td>
      )}
    </tr>
  )

  if (!tasks.length) {
    return <p className="p-8 text-center text-sm text-gray-600 dark:text-gray-300">No tasks yet. Add a task to start the plan.</p>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" data-testid="plan-sheet">
      {/* View controls */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-200">
        <span className="inline-flex gap-1">
          <button type="button" onClick={() => setCollapsed(new Set())} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Expand all</button>
          <button type="button" onClick={() => setCollapsed(new Set(summaryIds))} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Collapse all</button>
        </span>
        <button type="button" onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
          <Columns3 className="h-4 w-4" aria-hidden="true" /> Columns
        </button>
        <label className="hidden sm:inline-flex items-center gap-2" title="This column and every column to its left stay in place when you scroll right.">
          Freeze up to
          <select value={columns.some((c) => c.key === freezeUntil) ? freezeUntil : ''} onChange={(e) => setFreeze(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100">
            <option value="">No frozen columns</option>
            {columns.map((c) => <option key={c.key} value={c.key}>{c.srLabel || c.label}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={prefs.showOutline} onChange={(e) => setPref('showOutline', e.target.checked)} /> Outline number</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={prefs.showProjectSummary} onChange={(e) => setPref('showProjectSummary', e.target.checked)} /> Project summary</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={prefs.showBars} onChange={(e) => setPref('showBars', e.target.checked)} /> Gantt bars</label>
        {prefs.showBars && (
          <>
            <div role="group" aria-label="Zoom" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {ZOOMS.map((z) => (
                <button key={z.value} type="button" aria-pressed={prefs.zoom === z.value} onClick={() => setPref('zoom', z.value)}
                  className={`px-3 py-1 ${prefs.zoom === z.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
                  {z.label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={prefs.showBaseline} onChange={(e) => setPref('showBaseline', e.target.checked)} /> Active baseline</label>
            {baselines.length > 1 && (
              <label className="inline-flex items-center gap-2">Compare with
                <select value={compareId} onChange={(e) => setCompareId(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                  <option value="">No second baseline</option>
                  {baselines.filter((b) => !b.is_active_baseline).map((b) => <option key={b.id} value={b.id}>{b.baseline_number !== null && b.baseline_number !== undefined ? `B${b.baseline_number} · ` : ''}{b.baseline_name}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        {/* v1265: export the Gantt chart (task names + bars only), as shown here. */}
        <span className="ml-auto">
          <GanttExportMenu
            name={projectName}
            getRows={(onlyExpanded) => ganttRowsFromOutline(onlyExpanded ? visible : rows, project)}
            options={{
              zoom: prefs.zoom,
              showOutline: prefs.showOutline,
              title: projectName,
              subtitle: `Plan Sheet · ${today}${statusDate ? ` · status date ${statusDate}` : ''}`,
              today,
            }}
          />
        </span>
      </div>

      {showColumns && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700" role="region" aria-label="Choose columns">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <p className="text-gray-600 dark:text-gray-300">Tick the columns to show. Drag headings in the table, or use the arrows here, to change the order. Your layout is saved for you.</p>
            <button type="button" onClick={() => setLayout(null)} className="shrink-0 text-blue-700 underline dark:text-blue-300">Reset to default</button>
          </div>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {allColumns.map((c, i) => (
              <li key={c.key} className="flex items-center justify-between gap-2 rounded border border-gray-200 px-2 py-1 text-sm text-gray-800 dark:border-gray-700 dark:text-gray-100">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!c.hidden} disabled={c.required} onChange={() => toggleColumn(c.key)} />
                  {c.srLabel || c.label}
                </label>
                <span className="inline-flex">
                  <button type="button" onClick={() => nudge(c.key, -1)} disabled={i === 0} aria-label={`Move ${c.srLabel || c.label} left`} className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => nudge(c.key, 1)} disabled={i === allColumns.length - 1} aria-label={`Move ${c.srLabel || c.label} right`} className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"><ChevronRight className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!hasBaseline && (
        <p className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
          Save a baseline on the Baselines tab to see Planned % and % Deviation.
        </p>
      )}
      <div ref={wrapRef} className="flex">
        {/* Table */}
        {/* Phones (rules 29 / 39): ID, name, duration and % only, full width, no bars. */}
        <div className="overflow-x-auto max-sm:!w-full" style={{ width: prefs.showBars ? `${prefs.leftPct}%` : '100%' }}>
          <table className="border-collapse max-sm:!w-full" style={{ width: tableWidth, tableLayout: 'fixed' }}>
            <colgroup>
              {columns.map((c) => <col key={c.key} style={{ width: c.width }} />)}
              {hasActions && <col style={{ width: ACTION_W }} />}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40" style={{ height: GANTT_HEADER_H }}>
                {/* Drag a heading onto another to move it there (saved per user). */}
                {columns.map((c, i) => (
                  <th key={c.key} scope="col" draggable={!sizing} style={freezeProps(i, true).style}
                    onDragStart={(e) => { setDragKey(c.key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.key) }}
                    onDragOver={(e) => { if (dragKey && dragKey !== c.key) { e.preventDefault(); setOverKey(c.key) } }}
                    onDragLeave={() => setOverKey((k) => (k === c.key ? null : k))}
                    onDrop={(e) => { e.preventDefault(); if (dragKey) reorder(dragKey, c.key); setDragKey(null); setOverKey(null) }}
                    onDragEnd={() => { setDragKey(null); setOverKey(null) }}
                    title="Drag to move this column"
                    className={`relative ${freezeProps(i, true).className}${c.phone ? '' : 'hidden sm:table-cell '}px-2 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-grab select-none ${c.align === 'right' ? 'text-right' : 'text-left'} ${overKey === c.key ? 'border-l-2 border-blue-500' : ''} ${dragKey === c.key ? 'opacity-50' : ''}`}>
                    {c.srLabel ? <><span aria-hidden="true">{c.label}</span><span className="sr-only">{c.srLabel}</span></> : c.label}
                    {/* Resize: drag the right edge, or focus it and use ← → (Shift for bigger steps). */}
                    <span role="separator" aria-orientation="vertical" tabIndex={0} draggable={false}
                      aria-label={`Resize ${c.srLabel || c.label} column`} aria-valuenow={c.width} aria-valuemin={40} aria-valuemax={800}
                      title="Drag to resize"
                      onPointerDown={(e) => startResize(e, c)} onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onKeyDown={(e) => resizeByKey(e, c)} onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-blue-400 focus:bg-blue-500 focus:outline-none dark:hover:bg-blue-500" />
                  </th>
                ))}
                {hasActions && <th scope="col" className="px-1 text-right text-xs font-medium text-gray-600 dark:text-gray-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {project && renderRow(null, project)}
              {visible.map((r) => renderRow(r, r.task))}
            </tbody>
          </table>
        </div>

        {prefs.showBars && (
          <>
            <div role="separator" aria-orientation="vertical" aria-label="Resize table and bars" onPointerDown={startDrag}
              className="hidden sm:block w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 dark:bg-gray-700 dark:hover:bg-blue-500" />
            <div className="min-w-0 flex-1 hidden sm:block">
              <ScheduleGanttChart tasks={barTasks} dependencies={dependencies} zoom={prefs.zoom} showBaseline={prefs.showBaseline} keepOrder hideNames onTaskClick={(t) => t.id !== '__project__' && onOpen?.(t)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
