/**
 * Project Clone (GAP-22, v963 Phase 16) — Simulator mirror of Platform's
 * projectCloneService.js, on sim.project_clone_jobs / sim.practice_projects.
 * See SQL/v963q_pmis_gap_phase16_project_clone_sim_and_rls.sql.
 *
 * Adaptation: sim.practice_projects is a much smaller table than public.projects
 * (id, mandate_id, simulation_run_id, project_name, project_description,
 * project_code, project_status, start_date, is_practice_mode, practice_score,
 * feedback, user_id, timestamps — no planned/actual dates, no task-scoped child
 * table). There is no Simulator equivalent of Platform's `tasks` child-entity
 * clone, so `cloneOptions.includeTasks` is accepted for shape-compatibility with
 * the shared job contract but is a documented no-op here — only the practice
 * project's own core fields are cloned. mandate_id/simulation_run_id are reset to
 * null on the clone (a fresh, ownerless-of-mandate practice project), not copied.
 */
import { simDb } from '@nidus/supabase'

const NON_CLONED_PROJECT_FIELDS = new Set([
  'id',
  'project_code',
  'project_name',
  'created_at',
  'updated_at',
  'mandate_id',
  'simulation_run_id',
  'user_id',
  'practice_score',
  'feedback',
])

function db() {
  return simDb
}

async function currentUserId() {
  const {
    data: { user },
  } = await db().auth.getUser()
  return user?.id || null
}

function shiftDate(value, days) {
  if (!value || !days) return value || null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function listCloneableProjects() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await db()
    .from('practice_projects')
    .select('id, project_code, project_name')
    .eq('user_id', userId)
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

async function cloneProjectCore(sourceProject, userId, { dateShiftDays, suffix }) {
  const insertRow = {}
  for (const [key, value] of Object.entries(sourceProject)) {
    if (NON_CLONED_PROJECT_FIELDS.has(key)) continue
    insertRow[key] = value
  }
  if ('start_date' in insertRow) insertRow.start_date = shiftDate(insertRow.start_date, dateShiftDays)
  insertRow.project_name = `${sourceProject.project_name} ${suffix}`
  insertRow.project_code = `${sourceProject.project_code || 'SIM'}-CLONE-${Date.now().toString(36).toUpperCase()}`
  insertRow.user_id = userId
  insertRow.project_status = 'initiated'
  insertRow.is_practice_mode = true
  insertRow.practice_score = null
  insertRow.feedback = null

  const { data, error } = await db().from('practice_projects').insert(insertRow).select().single()
  if (error) throw error
  return data
}

/**
 * Creates a project_clone_jobs row and performs the clone. Wrapped end-to-end in try/catch so a
 * partial failure marks the job 'failed' with error_message rather than leaving an inconsistent
 * result silently reported as a success.
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
      .from('practice_projects')
      .select('*')
      .eq('id', sourceProjectId)
      .single()
    if (sourceError) throw sourceError

    const targetProject = await cloneProjectCore(sourceProject, userId, {
      dateShiftDays: dateShiftDays || 0,
      suffix: '(Clone)',
    })

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
