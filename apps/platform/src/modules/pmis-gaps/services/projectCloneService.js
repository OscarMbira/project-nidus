/**
 * Project Clone (GAP-22, v963 Phase 16) — public.project_clone_jobs.
 *
 * v1 scope (documented per the plan's explicit "keep it simple" instruction): cloning copies
 * the project's own core fields, and — when clone_options.includeTasks is set — its (non-deleted)
 * tasks. Both `projects` and `tasks` are the only entities cloned in v1: they are the two
 * "obviously safe" child entities (self-contained, no cross-project foreign keys pointing
 * outward) and copying them is enough to make the clone immediately useful as a new empty-ish
 * project scaffold. Anything with more entangled cross-references (risks/issues that link to
 * specific people and dates, documents, approvals, financials) is deliberately deferred — a
 * future pass can add more `clone_options` keys and extend `cloneEntities()` below without
 * touching the job bookkeeping (pending → running → completed/failed) around it.
 *
 * The whole operation runs synchronously in the browser for v1 (per the plan), but is modelled
 * as a job with real status transitions so a future move to a server-side/async executor only
 * needs to swap what calls cloneEntities(), not the job contract.
 */
import { platformDb } from '@nidus/supabase'

const NON_CLONED_PROJECT_FIELDS = new Set([
  'id',
  'project_code',
  'project_name',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'is_deleted',
  'deleted_at',
  'deleted_by',
  'actual_start_date',
  'actual_end_date',
  'percentage_complete',
  'actual_cost',
  'is_archived',
  'archived_at',
])

const PROJECT_DATE_FIELDS = ['planned_start_date', 'planned_end_date']
const TASK_DATE_FIELDS = ['planned_start_date', 'planned_end_date', 'due_date']

const NON_CLONED_TASK_FIELDS = new Set([
  'id',
  'task_code',
  'project_id',
  'parent_task_id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'is_deleted',
  'deleted_at',
  'deleted_by',
  'actual_start_date',
  'actual_end_date',
  'actual_hours',
  'actual_duration_days',
  'percentage_complete',
  'completion_date',
  'is_blocked',
  'blocked_reason',
])

function shiftDate(value, days) {
  if (!value || !days) return value || null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function db() {
  return platformDb
}

async function currentUserId() {
  const {
    data: { user },
  } = await db().auth.getUser()
  return user?.id || null
}

export async function listCloneableProjects() {
  const { data, error } = await db()
    .from('projects')
    .select('id, project_code, project_name')
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listCloneJobs({ sourceProjectId } = {}) {
  let q = db().from('project_clone_jobs').select('*').order('created_at', { ascending: false })
  if (sourceProjectId) q = q.eq('source_project_id', sourceProjectId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getCloneJob(id) {
  const { data, error } = await db().from('project_clone_jobs').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function cloneProjectCore(sourceProject, { dateShiftDays, suffix }) {
  const insertRow = {}
  for (const [key, value] of Object.entries(sourceProject)) {
    if (NON_CLONED_PROJECT_FIELDS.has(key)) continue
    insertRow[key] = value
  }
  for (const field of PROJECT_DATE_FIELDS) {
    if (field in insertRow) insertRow[field] = shiftDate(insertRow[field], dateShiftDays)
  }
  insertRow.project_name = `${sourceProject.project_name} ${suffix}`
  // project_code is unique — Admin ID Generation is not wired to `projects` (pre-dates rule
  // 16.2), so a short, collision-resistant suffix is appended to the source code instead of
  // hand-minting a fresh scheme.
  insertRow.project_code = `${sourceProject.project_code}-CLONE-${Date.now().toString(36).toUpperCase()}`
  insertRow.percentage_complete = 0
  insertRow.actual_cost = null
  insertRow.is_archived = false

  const { data, error } = await db().from('projects').insert(insertRow).select().single()
  if (error) throw error
  return data
}

async function cloneTasks(sourceProjectId, targetProjectId, dateShiftDays) {
  const { data: sourceTasks, error: fetchError } = await db()
    .from('tasks')
    .select('*')
    .eq('project_id', sourceProjectId)
    .eq('is_deleted', false)
  if (fetchError) throw fetchError
  if (!sourceTasks?.length) return 0

  const rows = sourceTasks.map((task) => {
    const row = {}
    for (const [key, value] of Object.entries(task)) {
      if (NON_CLONED_TASK_FIELDS.has(key)) continue
      row[key] = value
    }
    for (const field of TASK_DATE_FIELDS) {
      if (field in row) row[field] = shiftDate(row[field], dateShiftDays)
    }
    row.project_id = targetProjectId
    // Subtask parent linkage is dropped in v1 (parent ids would point at the source project's
    // tasks, not the new clones) — cloned tasks come in flat. Documented limitation, not a bug.
    return row
  })

  const { error: insertError } = await db().from('tasks').insert(rows)
  if (insertError) throw insertError
  return rows.length
}

/**
 * Creates a project_clone_jobs row and performs the clone. Wrapped end-to-end in try/catch so a
 * partial failure marks the job 'failed' with error_message rather than leaving an inconsistent
 * half-cloned project silently reported as a success.
 *
 * @param {{ sourceProjectId: string, cloneOptions?: { includeTasks?: boolean }, dateShiftDays?: number }} params
 */
export async function runProjectClone({ sourceProjectId, cloneOptions = {}, dateShiftDays = 0 }) {
  if (!sourceProjectId) throw new Error('sourceProjectId is required')
  const userId = await currentUserId()

  const { data: job, error: jobError } = await db()
    .from('project_clone_jobs')
    .insert({
      source_project_id: sourceProjectId,
      clone_options: cloneOptions,
      date_shift_days: dateShiftDays || 0,
      job_status: 'pending',
      started_by: userId,
    })
    .select()
    .single()
  if (jobError) throw jobError

  await db()
    .from('project_clone_jobs')
    .update({ job_status: 'running', started_at: new Date().toISOString() })
    .eq('id', job.id)

  try {
    const { data: sourceProject, error: sourceError } = await db()
      .from('projects')
      .select('*')
      .eq('id', sourceProjectId)
      .single()
    if (sourceError) throw sourceError

    const targetProject = await cloneProjectCore(sourceProject, {
      dateShiftDays: dateShiftDays || 0,
      suffix: '(Clone)',
    })

    if (cloneOptions.includeTasks) {
      await cloneTasks(sourceProjectId, targetProject.id, dateShiftDays || 0)
    }

    const { data: completedJob, error: completeError } = await db()
      .from('project_clone_jobs')
      .update({
        job_status: 'completed',
        target_project_id: targetProject.id,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', job.id)
      .select()
      .single()
    if (completeError) throw completeError
    return completedJob
  } catch (err) {
    const { data: failedJob } = await db()
      .from('project_clone_jobs')
      .update({
        job_status: 'failed',
        error_message: err?.message || String(err),
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single()
    return failedJob || { ...job, job_status: 'failed', error_message: err?.message || String(err) }
  }
}

export default { listCloneableProjects, listCloneJobs, getCloneJob, runProjectClone }
