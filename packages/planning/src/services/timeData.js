/**
 * v1239 Slice 4.3 — time logged against tasks, for the planning "My time" screen.
 *
 * Writes the same timesheet_entries rows the Platform timesheet module uses (public) or the
 * Simulator's twin (sim). Both tables key on project_id (the practice project id in sim) and
 * user_id = the auth user. Only draft rows are edited here; submitted/approved rows are
 * read-only and approval stays in each app's timesheet module.
 */
import { platformDb, simDb } from '@nidus/supabase'

export function createTimeData(isSim) {
  const db = isSim ? simDb : platformDb

  /** { authId, userId } — userId is the public users.id that tasks.assigned_to_user_id holds. */
  async function me() {
    const { data: auth } = await db.auth.getUser()
    const authId = auth?.user?.id || null
    if (!authId) return { authId: null, userId: null }
    const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
    return { authId, userId: data?.id || null }
  }

  async function listMyEntries(projectId, authId, from = null, to = null) {
    let q = db
      .from('timesheet_entries')
      .select('id, task_id, entry_date, hours_worked, status, description')
      .eq('project_id', projectId)
      .eq('user_id', authId)
      .eq('is_deleted', false)
    if (from) q = q.gte('entry_date', from)
    if (to) q = q.lte('entry_date', to)
    const { data, error } = await q
    if (error) throw new Error(error.message || 'Could not load your time.')
    return data || []
  }

  /**
   * Apply a week's grid. changes: [{ taskId, date, hours, entry? }] where `entry` is the existing
   * draft row (if any). 0 / empty hours removes the draft; locked rows are never touched.
   */
  async function saveWeek(projectId, authId, changes) {
    const ops = []
    for (const c of changes) {
      const hours = Math.round((Number(c.hours) || 0) * 100) / 100
      if (c.entry && c.entry.status !== 'draft') continue
      if (hours < 0 || hours > 24) throw new Error('Hours for one day must be between 0 and 24.')
      if (c.entry && hours === 0) {
        ops.push(db.from('timesheet_entries').update({ is_deleted: true }).eq('id', c.entry.id).eq('status', 'draft'))
      } else if (c.entry) {
        ops.push(db.from('timesheet_entries').update({ hours_worked: hours, updated_at: new Date().toISOString() }).eq('id', c.entry.id).eq('status', 'draft'))
      } else if (hours > 0) {
        ops.push(db.from('timesheet_entries').insert({ project_id: projectId, user_id: authId, task_id: c.taskId, entry_date: c.date, hours_worked: hours, status: 'draft' }))
      }
    }
    const results = await Promise.all(ops)
    const failed = results.find((r) => r.error)
    if (failed) throw new Error(failed.error.message || 'Could not save your time.')
    return ops.length
  }

  async function submitWeek(projectId, authId, from, to) {
    const { data, error } = await db
      .from('timesheet_entries')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', authId)
      .eq('status', 'draft')
      .eq('is_deleted', false)
      .gte('entry_date', from)
      .lte('entry_date', to)
      .select('id')
    if (error) throw new Error(error.message || 'Could not submit the week.')
    return (data || []).length
  }

  return { me, listMyEntries, saveWeek, submitWeek }
}

/** Grid model: rows per task, a cell per day ({ hours, entry, locked }). Pure; exported for tests. */
export function buildTimeGrid({ tasks, entries, days, userId }) {
  const byTask = new Map()
  for (const e of entries) {
    if (!e.task_id) continue
    if (!byTask.has(e.task_id)) byTask.set(e.task_id, [])
    byTask.get(e.task_id).push(e)
  }
  const visible = tasks.filter((t) =>
    (t.assigned_to_user_id && t.assigned_to_user_id === userId && Number(t.percentage_complete || 0) < 100)
    || (byTask.get(t.id) || []).some((e) => days.includes(e.entry_date))
  )
  return visible.map((t) => {
    const own = byTask.get(t.id) || []
    const cells = Object.fromEntries(days.map((d) => {
      const dayEntries = own.filter((e) => e.entry_date === d)
      const hours = dayEntries.reduce((s, e) => s + Number(e.hours_worked || 0), 0)
      const draft = dayEntries.find((e) => e.status === 'draft') || null
      // More than one row on a day, or any non-draft row, makes the cell read-only here.
      const locked = dayEntries.length > 1 || dayEntries.some((e) => e.status !== 'draft')
      return [d, { hours, entry: draft, locked }]
    }))
    const logged = own.reduce((s, e) => s + Number(e.hours_worked || 0), 0)
    const estimated = Number(t.estimated_hours) || 0
    return { task: t, cells, logged, estimated, remaining: estimated ? Math.round((estimated - logged) * 100) / 100 : null }
  })
}
