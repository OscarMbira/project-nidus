/**
 * v1354 — load and save resource levelling. The preview itself is engine/levelling.js.
 */
import { platformDb, simDb } from '@nidus/supabase'
import { createScheduleData } from './scheduleData.js'
import { loadCapacity } from './workload.js'

function fail(error, fallback) {
  const msg = error?.message || fallback
  if (/LEVEL_STALE/.test(msg)) throw new Error(msg.replace(/^.*LEVEL_STALE:\s*/, ''))
  if (/LEVEL_FORBIDDEN/.test(msg)) throw new Error('You can only change levelling on a project you can access.')
  if (/LEVEL_UNDO/.test(msg)) throw new Error('Only the last applied run can be undone, and only while those dates are unchanged.')
  throw new Error(msg || fallback)
}

export function createLevellingData(isSim) {
  const db = isSim ? simDb : platformDb
  const schedule = createScheduleData(isSim)
  const fk = isSim ? 'practice_project_id' : 'project_id'
  const projectsTable = isSim ? 'practice_projects' : 'projects'

  async function loadBundle(projectId) {
    const [tasks, dependencies, calendar] = await Promise.all([
      schedule.listTasks(projectId),
      schedule.listDependencies(projectId),
      schedule.getEngineCalendar(projectId),
    ])
    return { tasks, dependencies, calendar }
  }

  async function capacityFor(userIds, from, to) {
    if (isSim || !userIds.length) return {}
    return loadCapacity(userIds, from, to)
  }

  async function otherProjectTasks(projectIds, userIds) {
    if (!userIds.length) return []
    let q = db.from('tasks')
      .select('assigned_to_user_id, planned_start_date, planned_end_date, estimated_hours, percentage_complete')
      .in('assigned_to_user_id', userIds)
      .eq('is_deleted', false)
      .not('planned_start_date', 'is', null)
    if (projectIds.length === 1) q = q.neq(fk, projectIds[0])
    else if (projectIds.length) q = q.not(fk, 'in', `(${projectIds.join(',')})`)
    const { data, error } = await q
    if (error) fail(error, 'Could not load bookings on other projects.')
    return data || []
  }

  async function listProjects() {
    const { data, error } = await db.from(projectsTable)
      .select('id, project_name, project_code, planned_start_date')
      .eq('is_deleted', false)
      .order('project_name', { ascending: true })
    if (error) fail(error, 'Could not load projects.')
    return data || []
  }

  async function applyRun(payload) {
    const { data, error } = await db.rpc('apply_levelling_run', { p_payload: payload })
    if (error) fail(error, 'Could not save the levelling run.')
    return data
  }

  async function undoRun(runId) {
    const { data, error } = await db.rpc('undo_levelling_run', { p_run_id: runId })
    if (error) fail(error, 'Could not undo the levelling run.')
    return data
  }

  async function latestApplied(projectId) {
    const { data, error } = await db.from('levelling_runs')
      .select('id, display_id, created_at, status')
      .eq('project_id', projectId)
      .eq('status', 'applied')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) fail(error, 'Could not load the last levelling run.')
    return data || null
  }

  async function proposalsFor(projectId) {
    const { data: tasks, error } = await db.from('tasks').select('id').eq(fk, projectId).eq('is_deleted', false)
    if (error) fail(error, 'Could not load tasks.')
    const ids = (tasks || []).map((t) => t.id)
    if (!ids.length) return []
    const { data: moves, error: moveError } = await db.from('levelling_run_moves')
      .select('id, run_id, task_id, old_start, old_end, new_start, new_end, delay_days, reason, accepted')
      .in('task_id', ids)
      .is('accepted', null)
    if (moveError) fail(moveError, 'Could not load proposed moves.')
    return moves || []
  }

  async function decide(runId, decisions) {
    const { data, error } = await db.rpc('decide_levelling_moves', { p_run_id: runId, p_decisions: decisions })
    if (error) fail(error, 'Could not save the decision.')
    return data
  }

  return { loadBundle, capacityFor, otherProjectTasks, listProjects, applyRun, undoRun, latestApplied, proposalsFor, decide }
}
