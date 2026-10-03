/**
 * Recurring Tasks (GAP-08) — Simulator mirror of Platform's recurringTaskService.js.
 * Full CRUD on sim.recurring_task_templates, with the paired
 * sim.recurring_task_schedules row upserted alongside the template, and read-only
 * access to the generated sim.recurring_task_instances history.
 * v963 Phase 11 (Simulator). See SQL/v963l_sim_recurring_tasks_raci_tables.sql.
 */
import { simDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const TEMPLATE_TABLE = 'recurring_task_templates'
const OPTS = { sim: true }

export async function listRecurringTaskTemplates(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [] }
  const { data, error } = await simDb
    .from(TEMPLATE_TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getRecurringTaskTemplate(id) {
  const [{ data: template, error: templateError }, { data: schedule }, { data: instances }] = await Promise.all([
    simDb.from(TEMPLATE_TABLE).select('*').eq('id', id).maybeSingle(),
    simDb.from('recurring_task_schedules').select('*').eq('template_id', id).maybeSingle(),
    simDb.from('recurring_task_instances').select('*').eq('template_id', id).order('scheduled_for', { ascending: false }),
  ])
  if (templateError) return { success: false, data: null, error: templateError.message }
  if (!template) return { success: false, data: null, error: 'not_found' }
  return { success: true, data: { ...template, schedule: schedule || null, instances: instances || [] } }
}

export async function createRecurringTaskTemplate(practiceProjectId, payload) {
  try {
    const { next_run_at, timezone, ...templateFields } = payload
    const template = await createGapRecord(TEMPLATE_TABLE, { ...templateFields, practice_project_id: practiceProjectId }, OPTS)
    if (next_run_at || timezone) {
      const { error: scheduleError } = await simDb
        .from('recurring_task_schedules')
        .insert({ template_id: template.id, next_run_at: next_run_at || null, timezone: timezone || 'UTC' })
      if (scheduleError) throw scheduleError
    }
    return { success: true, data: template }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to create recurring task template' }
  }
}

export async function updateRecurringTaskTemplate(id, payload) {
  try {
    const { next_run_at, timezone, ...templateFields } = payload
    const template = await updateGapRecord(TEMPLATE_TABLE, id, templateFields, OPTS)
    if (next_run_at !== undefined || timezone !== undefined) {
      const { data: existing } = await simDb.from('recurring_task_schedules').select('id').eq('template_id', id).maybeSingle()
      if (existing?.id) {
        const { error } = await simDb
          .from('recurring_task_schedules')
          .update({ next_run_at: next_run_at || null, timezone: timezone || 'UTC', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await simDb
          .from('recurring_task_schedules')
          .insert({ template_id: id, next_run_at: next_run_at || null, timezone: timezone || 'UTC' })
        if (error) throw error
      }
    }
    return { success: true, data: template }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update recurring task template' }
  }
}

export async function deleteRecurringTaskTemplate(id) {
  try {
    await updateGapRecord(TEMPLATE_TABLE, id, { is_deleted: true }, OPTS)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete recurring task template' }
  }
}
