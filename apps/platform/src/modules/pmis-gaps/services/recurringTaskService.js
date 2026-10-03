/**
 * Recurring Tasks (GAP-08) — full CRUD on recurring_task_templates, with the
 * paired recurring_task_schedules row upserted alongside the template, and
 * read-only access to the generated recurring_task_instances history.
 * v963 Phase 11 (Platform). See SQL/v644_pmis_gap_tables_tier2.sql for schema.
 */
import { platformDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const TEMPLATE_TABLE = 'recurring_task_templates'

/** Templates for a project, newest first (list page applies its own default sort). */
export async function listRecurringTaskTemplates(projectId) {
  if (!projectId) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from(TEMPLATE_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

/** Template + its schedule row + its instance history, for the detail page. */
export async function getRecurringTaskTemplate(id) {
  const [{ data: template, error: templateError }, { data: schedule }, { data: instances }] = await Promise.all([
    platformDb.from(TEMPLATE_TABLE).select('*').eq('id', id).maybeSingle(),
    platformDb.from('recurring_task_schedules').select('*').eq('template_id', id).maybeSingle(),
    platformDb.from('recurring_task_instances').select('*').eq('template_id', id).order('scheduled_for', { ascending: false }),
  ])
  if (templateError) return { success: false, data: null, error: templateError.message }
  if (!template) return { success: false, data: null, error: 'not_found' }
  return { success: true, data: { ...template, schedule: schedule || null, instances: instances || [] } }
}

/**
 * @param {string} projectId
 * @param {{ template_name, entity_type, recurrence_pattern, recurrence_config, end_condition,
 *   max_occurrences, end_date, is_active, next_run_at, timezone }} payload
 */
export async function createRecurringTaskTemplate(projectId, payload) {
  try {
    const { next_run_at, timezone, ...templateFields } = payload
    const template = await createGapRecord(TEMPLATE_TABLE, { ...templateFields, project_id: projectId }, { setCreatedBy: true })
    if (next_run_at || timezone) {
      const { error: scheduleError } = await platformDb
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
    const template = await updateGapRecord(TEMPLATE_TABLE, id, templateFields)
    if (next_run_at !== undefined || timezone !== undefined) {
      const { data: existing } = await platformDb.from('recurring_task_schedules').select('id').eq('template_id', id).maybeSingle()
      if (existing?.id) {
        const { error } = await platformDb
          .from('recurring_task_schedules')
          .update({ next_run_at: next_run_at || null, timezone: timezone || 'UTC', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await platformDb
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

/** Soft delete (is_deleted = true) — matches the table's own soft-delete column/list filter. */
export async function deleteRecurringTaskTemplate(id) {
  try {
    await updateGapRecord(TEMPLATE_TABLE, id, { is_deleted: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete recurring task template' }
  }
}
