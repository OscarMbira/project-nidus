/**
 * v1239 Slice 3 — Schedule data for the shared schedule screens (grid, Gantt, network, critical
 * path, look-ahead, variance, milestones, dependencies, calendar, baselines).
 *
 * One service for every shell. `createScheduleData(isSim)` picks the data set:
 *   Platform / Planner → platformDb (public schema), key column project_id
 *   Simulator          → simDb (sim schema),         key column practice_project_id
 * Tasks are the canonical schedule records (v1239 D2). The database RPC
 * recalculate_project_schedule (SQL/v1245) is the authority on dates; the screens use
 * engine/schedule.js only for previews and cycle checks before a save.
 */
import { platformDb, simDb } from '@nidus/supabase'
import { buildCalendar, scheduleProject, ScheduleCycleError } from '../engine/schedule.js'
import { expandSummaryLinks, isAncestorOf } from './planOutline.js'

export const DEPENDENCY_TYPES = [
  { value: 'finish_to_start', short: 'FS', label: 'Finish → Start' },
  { value: 'start_to_start', short: 'SS', label: 'Start → Start' },
  { value: 'finish_to_finish', short: 'FF', label: 'Finish → Finish' },
  { value: 'start_to_finish', short: 'SF', label: 'Start → Finish' },
]

const SHORT_BY_TYPE = Object.fromEntries(DEPENDENCY_TYPES.map((t) => [t.value, t.short]))
export const dependencyShort = (type) => SHORT_BY_TYPE[String(type || '').toLowerCase()] || String(type || 'FS').toUpperCase()

const TASK_COLUMNS = [
  'id', 'task_code', 'task_name', 'task_description', 'parent_task_id', 'task_type', 'priority', 'status_id',
  'assigned_to_user_id', 'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date',
  'estimated_hours', 'actual_hours', 'estimated_duration_days', 'percentage_complete', 'is_milestone',
  'schedule_mode', 'constraint_type', 'constraint_date', 'row_version',
  'earliest_start_date', 'earliest_finish_date', 'latest_start_date', 'latest_finish_date', 'slack_days', 'is_critical_path',
  'baseline_start_date', 'baseline_end_date', 'baseline_duration_days', 'is_blocked', 'due_date',
  'created_at', 'created_by', 'updated_at', 'updated_by',
]
// v1265 S1: outline order + user WBS code (SQL/v1265_task_outline_and_summaries.sql).
const OUTLINE_COLUMNS = ['outline_position', 'wbs_code']
const TASK_SELECT = [...TASK_COLUMNS, ...OUTLINE_COLUMNS].join(', ')
const TASK_SELECT_LEGACY = TASK_COLUMNS.join(', ')

/** True when the database has not had a newer migration yet (column missing). */
const isMissingColumn = (error) => error?.code === '42703' || /column .* does not exist/i.test(error?.message || '')

/** Fields a task form may write. Everything else (float, critical flag, row_version) is engine/DB-owned. */
export const EDITABLE_TASK_FIELDS = [
  'task_name', 'task_description', 'parent_task_id', 'priority', 'assigned_to_user_id',
  'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date',
  'estimated_hours', 'estimated_duration_days', 'percentage_complete', 'is_milestone',
  'schedule_mode', 'constraint_type', 'constraint_date',
  'outline_position', 'wbs_code',
]

export class ScheduleConflictError extends Error {
  constructor(message) {
    super(message || 'Someone else changed this plan since you opened it.')
    this.name = 'ScheduleConflictError'
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const looksLikeUuid = (v) => UUID_RE.test(String(v || ''))

function fail(error, fallback) {
  const msg = error?.message || fallback
  if (/SCHEDULE_CONFLICT/.test(msg)) throw new ScheduleConflictError(msg.replace(/^.*SCHEDULE_CONFLICT:\s*/, ''))
  if (/SCHEDULE_CYCLE/.test(msg)) throw new Error('These links would make a loop. Remove one of them and try again.')
  throw new Error(msg)
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k] === '' ? null : obj[k]
  return out
}

export function createScheduleData(isSim) {
  const db = isSim ? simDb : platformDb
  const fk = isSim ? 'practice_project_id' : 'project_id'

  async function currentUserId() {
    if (isSim) {
      const { data } = await simDb.rpc('get_current_user_id')
      return data || null
    }
    const { data: auth } = await platformDb.auth.getUser()
    if (!auth?.user?.id) return null
    const { data } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
    return data?.id || null
  }

  // ── Tasks ────────────────────────────────────────────────────────────────
  async function listTasks(projectId) {
    if (!projectId) return []
    const query = (columns) => db
      .from('tasks')
      .select(columns)
      .eq(fk, projectId)
      .eq('is_deleted', false)
      .order('planned_start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    let { data, error } = await query(TASK_SELECT)
    // Before SQL v1265 is applied the outline columns do not exist yet: load without them.
    if (error && isMissingColumn(error)) ({ data, error } = await query(TASK_SELECT_LEGACY))
    if (error) fail(error, 'Could not load tasks.')
    return data || []
  }

  /** By task_code (display id, rule 16.1) or UUID, within the project. */
  async function getTask(projectId, key) {
    if (!key) return null
    const query = (columns) => {
      let q = db.from('tasks').select(columns).eq('is_deleted', false)
      q = looksLikeUuid(key) ? q.eq('id', key) : q.eq('task_code', key)
      if (projectId) q = q.eq(fk, projectId)
      return q.maybeSingle()
    }
    let { data, error } = await query(TASK_SELECT)
    if (error && isMissingColumn(error)) ({ data, error } = await query(TASK_SELECT_LEGACY))
    if (error) fail(error, 'Could not load the task.')
    return data || null
  }

  /**
   * Create or update a task. Updates send the row_version the form loaded; a mismatch means
   * someone else saved first → ScheduleConflictError (the screen offers a reload).
   */
  async function saveTask(projectId, values, existing = null) {
    const row = pick(values, EDITABLE_TASK_FIELDS)
    if (row.is_milestone) row.estimated_duration_days = 0
    const uid = await currentUserId()
    if (existing?.id) {
      const { data, error } = await db
        .from('tasks')
        .update({ ...row, updated_by: uid, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .eq('row_version', existing.row_version ?? 1)
        .select(TASK_SELECT_LEGACY)
        .maybeSingle()
      if (error) fail(error, 'Could not save the task.')
      if (!data) throw new ScheduleConflictError()
      return { data, operation: 'updated' }
    }
    const { data, error } = await db
      .from('tasks')
      .insert({ ...row, [fk]: projectId, task_code: '', created_by: uid, task_type: row.is_milestone ? 'milestone' : 'task' })
      .select(TASK_SELECT_LEGACY)
      .single()
    if (error) fail(error, 'Could not create the task.')
    // The display-ID trigger runs AFTER INSERT: re-read to show the assigned code.
    return { data: (await getTask(projectId, data.id)) || data, operation: 'created' }
  }

  async function deleteTask(task) {
    const uid = await currentUserId()
    const { data, error } = await db
      .from('tasks')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
      .eq('id', task.id)
      .eq('row_version', task.row_version ?? 1)
      .select('id')
      .maybeSingle()
    if (error) fail(error, 'Could not delete the task.')
    if (!data) throw new ScheduleConflictError()
  }

  /**
   * v1265: delete a task and all its sub-tasks (a summary's whole branch), as desktop plans do,
   * so sub-tasks are never left without their parent. The task itself is checked against the
   * version the screen loaded (conflict → reload prompt); then the schedule is recalculated.
   */
  async function deleteTaskTree(projectId, task, descendants = []) {
    await deleteTask(task)
    const ids = descendants.map((t) => t.id)
    if (ids.length) {
      const uid = await currentUserId()
      const { error } = await db
        .from('tasks')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
        .in('id', ids)
        .eq(fk, projectId)
      if (error) fail(error, `The task was deleted, but its ${ids.length} sub-task(s) could not be.`)
    }
    await recalculate(projectId, null).catch(() => {})
    return { deleted: 1 + ids.length }
  }

  /** People who can be assigned: active project members (names from public users, read-only). */
  async function listTeam(projectId) {
    if (!projectId) return []
    const { data, error } = await db
      .from(isSim ? 'practice_project_memberships' : 'project_memberships')
      .select('user_id')
      .eq(fk, projectId)
      .eq('is_active', true)
    if (error) fail(error, 'Could not load the project team.')
    const ids = [...new Set((data || []).map((m) => m.user_id).filter(Boolean))]
    if (!ids.length) return []
    const { data: users, error: usersError } = await platformDb.from('users').select('id, full_name, email').in('id', ids)
    if (usersError) fail(usersError, 'Could not load team names.')
    return (users || [])
      .map((u) => ({ id: u.id, name: u.full_name || u.email || 'Unnamed' }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  /** v1265: names for any user ids (e.g. assignees who are not on the project team). */
  async function listUserNames(ids) {
    const wanted = [...new Set((ids || []).filter(Boolean))]
    if (!wanted.length) return []
    const { data, error } = await platformDb.from('users').select('id, full_name, email').in('id', wanted)
    if (error) fail(error, 'Could not load user names.')
    return (data || []).map((u) => ({ id: u.id, name: u.full_name || u.email || 'Unnamed' }))
  }

  /** v1265: the project's name (Plan sheet project summary row). */
  async function getProjectName(projectId) {
    if (!projectId) return null
    const { data, error } = await db.from(isSim ? 'practice_projects' : 'projects').select('project_name').eq('id', projectId).maybeSingle()
    if (error) return null
    return data?.project_name || null
  }

  // ── Dependencies (within the project) ─────────────────────────────────────
  async function listDependencies(projectId, tasks = null) {
    const list = tasks || (await listTasks(projectId))
    const ids = list.map((t) => t.id)
    if (!ids.length) return []
    const { data, error } = await db
      .from('task_dependencies')
      .select('id, predecessor_task_id, successor_task_id, dependency_type, lag_days, created_at')
      .in('successor_task_id', ids)
      .eq('is_deleted', false)
    if (error) fail(error, 'Could not load dependencies.')
    return data || []
  }

  /** Adds a link after checking (with the preview engine) that it does not create a loop. */
  async function addDependency(projectId, { predecessorId, successorId, type = 'finish_to_start', lag = 0 }, context = null) {
    if (!predecessorId || !successorId) throw new Error('Choose both tasks.')
    if (predecessorId === successorId) throw new Error('A task cannot depend on itself.')
    const tasks = context?.tasks || (await listTasks(projectId))
    const deps = context?.dependencies || (await listDependencies(projectId, tasks))
    if (deps.some((d) => d.predecessor_task_id === predecessorId && d.successor_task_id === successorId)) {
      throw new Error('These tasks are already linked.')
    }
    if (isAncestorOf(tasks, predecessorId, successorId) || isAncestorOf(tasks, successorId, predecessorId)) {
      throw new Error('A summary task cannot be linked to one of its own sub-tasks.')
    }
    try {
      previewSchedule({ tasks, dependencies: [...deps, { predecessor_task_id: predecessorId, successor_task_id: successorId, dependency_type: type, lag_days: lag }] })
    } catch (err) {
      if (err instanceof ScheduleCycleError) throw new Error('This link would make a loop. Remove one of the other links first.')
      throw err
    }
    const uid = await currentUserId()
    const { data, error } = await db
      .from('task_dependencies')
      .insert({ predecessor_task_id: predecessorId, successor_task_id: successorId, dependency_type: type, lag_days: Number(lag) || 0, created_by: uid })
      .select('id, predecessor_task_id, successor_task_id, dependency_type, lag_days, created_at')
      .single()
    if (error) fail(error, 'Could not add the dependency.')
    return data
  }

  async function removeDependency(dependencyId) {
    const uid = await currentUserId()
    const { error } = await db
      .from('task_dependencies')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
      .eq('id', dependencyId)
    if (error) fail(error, 'Could not remove the dependency.')
  }

  /** Links to and from other projects (read-only here; managed in the dependency register). */
  async function listExternalDependencies(projectId) {
    if (!projectId) return []
    const { data, error } = await db
      .from('inter_project_dependencies')
      .select('id, dependency_code, dependency_name, dependency_type, dependency_status, source_project_id, target_project_id, lag_days, created_at')
      .or(`source_project_id.eq.${projectId},target_project_id.eq.${projectId}`)
      .eq('is_deleted', false)
    if (error) fail(error, 'Could not load links to other projects.')
    return data || []
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  async function getCalendarRows(projectId) {
    const [cal, exc] = await Promise.all([
      db.from('project_calendars').select('*').eq(fk, projectId).eq('is_deleted', false).maybeSingle(),
      db.from('project_calendar_exceptions').select('*').eq(fk, projectId).eq('is_deleted', false).order('exception_date', { ascending: true }),
    ])
    if (cal.error) fail(cal.error, 'Could not load the calendar.')
    if (exc.error) fail(exc.error, 'Could not load calendar exceptions.')
    return { calendar: cal.data || null, exceptions: exc.data || [] }
  }

  /** The engine calendar for previews (same rules the RPC uses: Mon–Fri when none is set). */
  async function getEngineCalendar(projectId) {
    const { calendar, exceptions } = await getCalendarRows(projectId)
    return toEngineCalendar(calendar, exceptions)
  }

  async function saveCalendar(projectId, values, existing) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    if (!days.some((d) => values[d])) throw new Error('Choose at least one working day.')
    const row = { ...pick(values, [...days, 'hours_per_day', 'notes']), [fk]: projectId }
    const q = existing?.id
      ? db.from('project_calendars').update(row).eq('id', existing.id)
      : db.from('project_calendars').insert(row)
    const { data, error } = await q.select().single()
    if (error) fail(error, 'Could not save the calendar.')
    return { data, operation: existing?.id ? 'updated' : 'created' }
  }

  async function getCalendarException(projectId, id) {
    const { data, error } = await db.from('project_calendar_exceptions').select('*').eq('id', id).eq(fk, projectId).maybeSingle()
    if (error) fail(error, 'Could not load the exception.')
    return data || null
  }

  async function saveCalendarException(projectId, values, existing) {
    if (!values.exception_date) throw new Error('Choose a date.')
    const row = { ...pick(values, ['exception_date', 'exception_type', 'is_working_day', 'description']), [fk]: projectId }
    if (!['holiday', 'other'].includes(row.exception_type)) row.exception_type = 'holiday'
    if (row.exception_type === 'holiday') row.is_working_day = false
    const q = existing?.id
      ? db.from('project_calendar_exceptions').update(row).eq('id', existing.id)
      : db.from('project_calendar_exceptions').insert(row)
    const { data, error } = await q.select().single()
    if (error) fail(error, 'Could not save the exception.')
    return { data, operation: existing?.id ? 'updated' : 'created' }
  }

  async function deleteCalendarException(id) {
    const { error } = await db.from('project_calendar_exceptions').update({ is_deleted: true }).eq('id', id)
    if (error) fail(error, 'Could not delete the exception.')
  }

  // ── Recalculate (database authority) ──────────────────────────────────────
  /** expectedVersions: { [taskId]: row_version } for the rows this screen showed. */
  async function recalculate(projectId, expectedVersions = null) {
    const args = isSim
      ? { p_practice_project_id: projectId, p_expected_versions: expectedVersions }
      : { p_project_id: projectId, p_expected_versions: expectedVersions }
    const { data, error } = await db.rpc('recalculate_project_schedule', args)
    if (error) fail(error, 'Could not recalculate the schedule.')
    return data
  }

  // ── Baselines ────────────────────────────────────────────────────────────
  async function listBaselines(projectId) {
    const { data, error } = await db
      .from('project_baselines')
      .select('*')
      .eq(fk, projectId)
      .order('created_at', { ascending: false })
    if (error) fail(error, 'Could not load baselines.')
    // v1265: schedule baselines newest first by number (B2, B1, B0); others by date.
    return (data || [])
      .filter((b) => b.is_deleted !== true)
      .sort((a, b) => (b.baseline_number ?? -1) - (a.baseline_number ?? -1) || String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }

  /**
   * Saves the current task dates as a schedule baseline (one project_baselines row, task dates in
   * baseline_data). v1265: the database numbers it (B0, B1 …). B0 is approved automatically and
   * made active; later baselines need a reason and must be approved before they can be active.
   */
  async function saveBaseline(projectId, { name, reason, changeRequestRef, comments }, tasks, existing = []) {
    if (!String(name || '').trim()) throw new Error('Give the baseline a name.')
    const isRebaseline = existing.some((b) => (b.baseline_type || 'schedule') === 'schedule')
    if (isRebaseline && !String(reason || '').trim()) throw new Error('Say why the plan is being re-baselined.')
    const uid = await currentUserId()
    const today = new Date().toISOString().slice(0, 10)
    const snapshot = tasks.map((t) => ({ id: t.id, task_code: t.task_code, task_name: t.task_name, start: t.planned_start_date, finish: t.planned_end_date, duration: t.estimated_duration_days }))
    const row = { [fk]: projectId, baseline_name: name.trim(), baseline_type: 'schedule', baseline_date: today, baseline_data: { tasks: snapshot }, comments: comments || null, created_by: uid }
    if (String(reason || '').trim()) row.reason = reason.trim()
    if (String(changeRequestRef || '').trim()) row.change_request_ref = changeRequestRef.trim()
    const { data, error } = await db.from('project_baselines').insert(row).select().single()
    if (error) fail(error, 'Could not save the baseline.')
    if (data.baseline_number === 0) {
      await activateBaseline(data.id)
    } else if (data.baseline_number === undefined) {
      // Before SQL v1265 S2: copy the dates straight onto the tasks, as before.
      const results = await Promise.all(tasks.map((t) =>
        db.from('tasks').update({ baseline_start_date: t.planned_start_date, baseline_end_date: t.planned_end_date, baseline_duration_days: t.estimated_duration_days }).eq('id', t.id)
      ))
      // Supabase returns errors rather than throwing: report them instead of silently losing the task dates.
      const failed = results.filter((r) => r?.error)
      if (failed.length) fail(failed[0].error, `The baseline was saved, but ${failed.length} task(s) could not be updated with its dates.`)
    }
    return data
  }

  /** v1265: approve a baseline; the justification is required (rule 53). */
  async function approveBaseline(baselineId, notes) {
    if (!String(notes || '').trim()) throw new Error('Write why you are approving this baseline.')
    const { data, error } = await db.rpc('approve_schedule_baseline', { p_baseline_id: baselineId, p_notes: notes.trim() })
    if (error) fail(error, 'Could not approve the baseline.')
    return data
  }

  /** v1265: make an approved baseline the active one (copies its dates onto the tasks). */
  async function activateBaseline(baselineId) {
    const { data, error } = await db.rpc('activate_schedule_baseline', { p_baseline_id: baselineId })
    if (error) fail(error, 'Could not make this baseline active.')
    return data
  }

  /** v1265: the project's status date (NULL = today) for Planned % complete. */
  async function getStatusDate(projectId) {
    if (!projectId) return null
    const { data, error } = await db.from(isSim ? 'practice_projects' : 'projects').select('status_date').eq('id', projectId).maybeSingle()
    if (error) return null // before SQL v1265 S2 the column does not exist: use today
    return data?.status_date || null
  }

  async function setStatusDate(projectId, date) {
    const { data, error } = isSim
      ? await db.rpc('set_practice_project_status_date', { p_practice_project_id: projectId, p_date: date || null })
      : await db.rpc('set_project_status_date', { p_project_id: projectId, p_date: date || null })
    if (error) fail(error, 'Could not save the status date.')
    return data || null
  }

  /**
   * Import a checked preview (scheduleExchangeService.buildPreview): adds tasks and links to the
   * project in two bulk inserts, then recalculates. Refuses a file whose links make a loop
   * before writing anything. Existing tasks are not changed.
   */
  async function importPlan(projectId, preview, typeToDb) {
    if (preview.errors?.length) throw new Error('Fix the problems in the file first.')
    try {
      previewSchedule({
        tasks: preview.tasks.map((t) => ({ ...t, id: t.ref })),
        dependencies: preview.links.map((l) => ({ predecessor_task_id: l.fromRef, successor_task_id: l.toRef, dependency_type: typeToDb[l.type], lag_days: l.lag })),
      })
    } catch (err) {
      if (err instanceof ScheduleCycleError) throw new Error(`These tasks link in a loop: ${err.taskIds.join(', ')}. Fix the Predecessors column and try again.`)
      throw err
    }
    const uid = await currentUserId()
    const batch = `import-${new Date().toISOString()}`
    const rows = preview.tasks.map((t) => ({
      [fk]: projectId,
      task_code: '',
      task_name: t.task_name,
      task_type: t.is_milestone ? 'milestone' : 'task',
      is_milestone: t.is_milestone,
      estimated_duration_days: t.estimated_duration_days,
      planned_start_date: t.planned_start_date,
      planned_end_date: t.planned_end_date,
      schedule_mode: t.schedule_mode,
      percentage_complete: t.percentage_complete,
      estimated_hours: t.estimated_hours,
      created_by: uid,
      custom_fields: { import_batch: batch, import_ref: t.ref },
    }))
    const { data: inserted, error } = await db.from('tasks').insert(rows).select('id, custom_fields')
    if (error) fail(error, 'Could not import the tasks.')
    const idByRef = new Map((inserted || []).map((r) => [String(r.custom_fields?.import_ref), r.id]))
    if (idByRef.size !== rows.length) throw new Error('Some tasks were not saved. Check the plan before importing again.')
    if (preview.links.length) {
      const links = preview.links.map((l) => ({
        predecessor_task_id: idByRef.get(l.fromRef),
        successor_task_id: idByRef.get(l.toRef),
        dependency_type: typeToDb[l.type],
        lag_days: l.lag,
        created_by: uid,
      }))
      const { error: linkError } = await db.from('task_dependencies').insert(links)
      if (linkError) fail(linkError, 'Tasks were imported but their links could not be saved.')
    }
    let recalculated = true
    try { await recalculate(projectId, null) } catch { recalculated = false }
    return { tasks: rows.length, links: preview.links.length, batch, recalculated }
  }

  return {
    isSim, fk, listTasks, getTask, saveTask, deleteTask, deleteTaskTree, listTeam, importPlan,
    getCurrentUserId: currentUserId,
    listDependencies, addDependency, removeDependency, listExternalDependencies,
    getCalendarRows, getEngineCalendar, saveCalendar, getCalendarException, saveCalendarException, deleteCalendarException,
    recalculate, listBaselines, saveBaseline, approveBaseline, activateBaseline, getStatusDate, setStatusDate,
    listUserNames, getProjectName,
  }
}

// ── Pure helpers (shared by screens and tests) ──────────────────────────────
export function toEngineCalendar(calendar, exceptions = []) {
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const workingDays = calendar ? map.map((d, i) => (calendar[d] ? i : null)).filter((i) => i !== null) : [1, 2, 3, 4, 5]
  return buildCalendar({
    workingDays: workingDays.length ? workingDays : [1, 2, 3, 4, 5],
    exceptions: exceptions.filter((e) => !e.is_working_day).map((e) => e.exception_date),
    extraWorkingDays: exceptions.filter((e) => e.is_working_day).map((e) => e.exception_date),
  })
}

/**
 * Engine preview over DB rows (same inputs the RPC builds). Throws ScheduleCycleError on a loop.
 * v1265: only leaf tasks are scheduled and links on summaries apply to their leaves (planOutline).
 */
export function previewSchedule({ tasks, dependencies = [], calendar = null, projectStart = null }) {
  const start = projectStart || tasks.map((t) => t.planned_start_date).filter(Boolean).sort()[0] || new Date().toISOString().slice(0, 10)
  const links = dependencies.map((d) => ({ pred: d.predecessor_task_id, succ: d.successor_task_id, type: dependencyShort(d.dependency_type), lag: d.lag_days }))
  const { leafIds, deps } = expandSummaryLinks(tasks, links)
  return scheduleProject({
    projectStart: start,
    calendar: calendar || buildCalendar(),
    tasks: tasks.filter((t) => leafIds.has(t.id)).map((t) => ({
      id: t.id,
      duration: t.is_milestone ? 0 : (t.estimated_duration_days ?? 1),
      mode: t.schedule_mode,
      start: t.planned_start_date,
      constraintType: t.constraint_type,
      constraintDate: t.constraint_date,
    })),
    dependencies: deps,
  })
}

/** { taskId: row_version } for the recalculate RPC's conflict check. */
export const expectedVersionsOf = (tasks) => Object.fromEntries(tasks.map((t) => [t.id, t.row_version ?? 1]))

/**
 * A task's baseline dates: its own baseline_* columns, else its entry in the most recent schedule
 * baseline snapshot (project_baselines.baseline_data.tasks), e.g. a baseline saved before the
 * columns were filled. `baselines` is newest first (listBaselines). Null when neither has dates.
 */
export function taskBaselineDates(task, baselines = []) {
  if (!task) return null
  if (task.baseline_start_date || task.baseline_end_date) {
    return { start: task.baseline_start_date || null, finish: task.baseline_end_date || null, name: null, date: null }
  }
  // v1265: the active baseline first, then newest first.
  const ordered = [...baselines].sort((x, y) => Number(Boolean(y?.is_active_baseline)) - Number(Boolean(x?.is_active_baseline)))
  for (const b of ordered) {
    if (b?.baseline_type && b.baseline_type !== 'schedule') continue
    const entry = (b?.baseline_data?.tasks || []).find((t) => t.id === task.id || (task.task_code && t.task_code === task.task_code))
    if (entry && (entry.start || entry.finish)) {
      return { start: entry.start || null, finish: entry.finish || null, name: b.baseline_name || null, date: b.baseline_date || String(b.created_at || '').slice(0, 10) || null }
    }
  }
  return null
}

/** Calendar-day variance of finish vs baseline finish (positive = late). Null when either is missing. */
export function finishVarianceDays(task) {
  if (!task.baseline_end_date || !task.planned_end_date) return null
  const ms = Date.parse(task.planned_end_date) - Date.parse(task.baseline_end_date)
  return Math.round(ms / 86400000)
}
