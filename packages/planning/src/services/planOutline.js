/**
 * v1265 S1 — plan outline: hierarchy, outline numbers, summary roll-ups and summary links.
 * Pure functions (no I/O), shared by the Plan sheet and the schedule preview.
 *
 * Same rules as SQL/v1265_task_outline_and_summaries.sql (database authority). Keep in step:
 *   - a summary task is a task with sub-tasks; only leaf tasks are scheduled;
 *   - a link to / from a summary applies to every leaf under it; links between a summary and
 *     its own descendants are ignored;
 *   - summary dates = earliest leaf start → latest leaf finish; critical if any leaf is;
 *     % complete weighted by leaf duration (simple average when all leaves are 0 days).
 * Outline numbers (1.1.2.3) come from position among siblings (outline_position) and are
 * never stored (PRD D1). The user's own WBS code is a separate field.
 */
import { workingDaysBetween, buildCalendar } from '../engine/schedule.js'

const text = (v) => String(v ?? '')

/** Sibling order: outline_position, then start date, then created, then name (stable for unset rows). */
export function compareSiblings(a, b) {
  const pa = a.outline_position ?? Number.MAX_SAFE_INTEGER
  const pb = b.outline_position ?? Number.MAX_SAFE_INTEGER
  if (pa !== pb) return pa - pb
  return text(a.planned_start_date || '9999').localeCompare(text(b.planned_start_date || '9999'))
    || text(a.created_at).localeCompare(text(b.created_at))
    || text(a.task_name).localeCompare(text(b.task_name), undefined, { sensitivity: 'base' })
}

/**
 * Children by parent id ('' = top level). A parent that is not in the list (deleted, other
 * project) or a parent loop makes the task top level, so no task is ever lost.
 */
export function childrenByParent(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const valid = (id) => (id && byId.has(id) ? id : '')
  const parentOf = new Map()
  for (const t of tasks) {
    let p = valid(t.parent_task_id)
    // Loop guard: if walking up comes back to this task, treat it as top level.
    const seen = new Set()
    for (let cur = p; cur; cur = valid(byId.get(cur).parent_task_id)) {
      if (cur === t.id) { p = ''; break }
      if (seen.has(cur)) break // a loop higher up, not through this task
      seen.add(cur)
    }
    parentOf.set(t.id, p)
  }
  const children = new Map([['', []]])
  for (const t of tasks) {
    const p = parentOf.get(t.id)
    if (!children.has(p)) children.set(p, [])
    children.get(p).push(t)
  }
  for (const list of children.values()) list.sort(compareSiblings)
  return { children, parentOf }
}

/**
 * Outline rows in plan order (depth-first).
 * Each row: { task, id, rowNumber (1-based ID column), depth (0 = top), outline ('1.2.3'),
 *             parentId, isSummary, collapsed, visible }.
 * `collapsed` is a Set of task ids whose children are hidden; hidden rows have visible=false.
 */
export function buildOutline(tasks, { collapsed = new Set() } = {}) {
  const { children, parentOf } = childrenByParent(tasks)
  const rows = []
  const walk = (parentId, prefix, depth, hidden) => {
    const list = children.get(parentId) || []
    list.forEach((task, i) => {
      const outline = prefix ? `${prefix}.${i + 1}` : String(i + 1)
      const isSummary = (children.get(task.id) || []).length > 0
      const isCollapsed = isSummary && collapsed.has(task.id)
      rows.push({
        task, id: task.id, rowNumber: rows.length + 1, depth, outline,
        parentId: parentOf.get(task.id) || null, isSummary, collapsed: isCollapsed, visible: !hidden,
      })
      if (isSummary) walk(task.id, outline, depth + 1, hidden || isCollapsed)
    })
  }
  walk('', '', 0, false)
  return rows
}

/** Leaf ids under every task (a leaf maps to itself). */
export function leavesUnder(tasks) {
  const { children } = childrenByParent(tasks)
  const memo = new Map()
  const leaves = (id) => {
    if (memo.has(id)) return memo.get(id)
    const kids = children.get(id) || []
    const out = kids.length ? kids.flatMap((k) => leaves(k.id)) : [id]
    memo.set(id, out)
    return out
  }
  for (const t of tasks) leaves(t.id)
  return memo
}

function ancestorsOf(tasks) {
  const { parentOf } = childrenByParent(tasks)
  const memo = new Map()
  const up = (id) => {
    if (memo.has(id)) return memo.get(id)
    const p = parentOf.get(id)
    const out = p ? new Set([p, ...up(p)]) : new Set()
    memo.set(id, out)
    return out
  }
  for (const t of tasks) up(t.id)
  return memo
}

/**
 * Engine input with summaries resolved (matches planning_expand_summaries).
 * deps: [{ pred, succ, ...rest }] by task id. Returns { leafIds: Set, deps }.
 */
export function expandSummaryLinks(tasks, deps) {
  const leaves = leavesUnder(tasks)
  const anc = ancestorsOf(tasks)
  const leafIds = new Set(tasks.filter((t) => (leaves.get(t.id) || []).length === 1 && leaves.get(t.id)[0] === t.id).map((t) => t.id))
  const out = []
  for (const d of deps) {
    if (!leaves.has(d.pred) || !leaves.has(d.succ)) continue
    if (anc.get(d.succ)?.has(d.pred) || anc.get(d.pred)?.has(d.succ)) continue
    for (const p of leaves.get(d.pred)) {
      for (const s of leaves.get(d.succ)) {
        if (p !== s) out.push({ ...d, pred: p, succ: s })
      }
    }
  }
  return { leafIds, deps: out }
}

const durationOf = (t) => (t.is_milestone ? 0 : Math.max(0, Number(t.estimated_duration_days ?? 1) || 0))

/**
 * Summary values from leaves (matches planning_rollup_summaries), keyed by summary id:
 * { start, finish, duration (working days), percent, critical, slack }.
 * `calendar` is an engine calendar (buildCalendar); Mon–Fri when omitted.
 */
export function rollUpSummaries(tasks, calendar = buildCalendar()) {
  const leaves = leavesUnder(tasks)
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const out = new Map()
  for (const t of tasks) {
    const ids = leaves.get(t.id) || []
    if (ids.length === 1 && ids[0] === t.id) continue // a leaf
    const leafRows = ids.map((id) => byId.get(id)).filter(Boolean)
    const starts = leafRows.map((l) => l.planned_start_date).filter(Boolean).sort()
    const finishes = leafRows.map((l) => l.planned_end_date || l.planned_start_date).filter(Boolean).sort()
    const start = starts[0] || null
    const finish = finishes[finishes.length - 1] || null
    let wsum = 0
    let dsum = 0
    let psum = 0
    for (const l of leafRows) {
      const d = durationOf(l)
      const p = Number(l.percentage_complete || 0)
      wsum += d * p
      dsum += d
      psum += p
    }
    const percent = leafRows.length ? Math.round((dsum > 0 ? wsum / dsum : psum / leafRows.length) * 100) / 100 : 0
    const slacks = leafRows.map((l) => l.slack_days).filter((v) => v !== null && v !== undefined)
    out.set(t.id, {
      start,
      finish,
      duration: start && finish ? workingDaysBetween(start, finish, calendar) + 1 : null,
      percent,
      critical: leafRows.some((l) => l.is_critical_path),
      slack: slacks.length ? Math.min(...slacks) : null,
    })
  }
  return out
}

/**
 * Tasks with summary values applied (dates, duration, % complete, critical), ready to display.
 * Leaves are returned unchanged. Adds `is_summary`.
 */
export function withRollUps(tasks, calendar) {
  const roll = rollUpSummaries(tasks, calendar)
  return tasks.map((t) => {
    const r = roll.get(t.id)
    if (!r) return { ...t, is_summary: false }
    return {
      ...t,
      is_summary: true,
      is_milestone: false,
      planned_start_date: r.start,
      planned_end_date: r.finish,
      estimated_duration_days: r.duration ?? t.estimated_duration_days,
      percentage_complete: r.percent,
      is_critical_path: r.critical,
      slack_days: r.slack,
    }
  })
}

/** The project summary row (row 0): the whole plan rolled up as one summary. */
export function projectSummary(tasks, calendar = buildCalendar(), name = 'Project') {
  if (!tasks.length) return null
  const root = { id: '__project__', task_name: name }
  const lifted = [root, ...tasks.map((t) => (t.parent_task_id && tasks.some((x) => x.id === t.parent_task_id) ? t : { ...t, parent_task_id: root.id }))]
  const r = rollUpSummaries(lifted, calendar).get(root.id)
  return r ? { ...root, is_summary: true, planned_start_date: r.start, planned_end_date: r.finish, estimated_duration_days: r.duration, percentage_complete: r.percent, is_critical_path: r.critical } : null
}

/** "5 days", "1 day", "0 days". */
export function formatDuration(days) {
  if (days === null || days === undefined || days === '') return '—'
  const n = Math.round(Number(days) * 100) / 100
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

const SHORT = { finish_to_start: 'FS', start_to_start: 'SS', finish_to_finish: 'FF', start_to_finish: 'SF' }

/**
 * Desktop-style link text by ID (row number): "10", "12SS", "13FS+2d", "7FF-1d".
 * FS with no lag shows just the ID. `side` 'pred' lists predecessors of each task, 'succ' successors.
 */
export function linkTextByTask(rows, deps, side = 'pred') {
  const numberOf = new Map(rows.map((r) => [r.id, r.rowNumber]))
  const out = new Map()
  for (const d of deps) {
    const own = side === 'pred' ? d.successor_task_id : d.predecessor_task_id
    const other = side === 'pred' ? d.predecessor_task_id : d.successor_task_id
    const n = numberOf.get(other)
    if (!n || !numberOf.has(own)) continue
    const type = SHORT[String(d.dependency_type || '').toLowerCase()] || String(d.dependency_type || 'FS').toUpperCase()
    const lag = Number(d.lag_days || 0)
    const label = `${n}${type !== 'FS' || lag ? type : ''}${lag ? `${lag > 0 ? '+' : ''}${lag}d` : ''}`
    if (!out.has(own)) out.set(own, [])
    out.get(own).push({ n, label })
  }
  return new Map([...out].map(([id, list]) => [id, list.sort((a, b) => a.n - b.n).map((x) => x.label).join(', ')]))
}

/**
 * Tasks a task may be linked to (as "comes after"), in plan order, as picker options:
 * { value, label, mine } with the outline number and an indent. Leaves out the task itself, its
 * summaries and sub-tasks (refused by the scheduler) and tasks it already comes after.
 */
export function predecessorChoices(tasks, task, { existing = [], userId = null } = {}) {
  const rows = buildOutline(tasks)
  const anc = ancestorsOf(tasks).get(task.id) || new Set()
  const below = new Set(descendantsOf(tasks, task.id).map((t) => t.id))
  const linked = new Set(existing)
  return rows
    .filter((r) => r.id !== task.id && !anc.has(r.id) && !below.has(r.id) && !linked.has(r.id))
    .map((r) => ({
      value: r.id,
      label: `${'\u2003'.repeat(r.depth)}${r.outline}  ${r.task.task_code ? `${r.task.task_code} · ` : ''}${r.task.task_name}`,
      mine: Boolean(userId) && r.task.assigned_to_user_id === userId,
    }))
}

/** True when `ancestorId` is above `id` in the outline (parent, grandparent, …). */
export function isAncestorOf(tasks, ancestorId, id) {
  return ancestorsOf(tasks).get(id)?.has(ancestorId) || false
}

/** Every task under `id` (children, grandchildren, …), in outline order. */
export function descendantsOf(tasks, id) {
  const { children } = childrenByParent(tasks)
  const out = []
  const walk = (pid) => {
    for (const c of children.get(pid) || []) {
      out.push(c)
      walk(c.id)
    }
  }
  walk(id)
  return out
}
