import { simDb } from './supabase/supabaseClient'

/**
 * Simulator: project agile templates use practice_project_id (sim.project_agile_templates).
 */
export async function listTemplates(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_agile_templates')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function upsertTemplate(row) {
  const pid = row.practice_project_id
  if (!pid) throw new Error('practice_project_id is required')
  const { data: existing } = await simDb
    .from('project_agile_templates')
    .select('id')
    .eq('practice_project_id', pid)
    .eq('template_type', row.template_type)
    .eq('is_deleted', false)
    .maybeSingle()
  const payload = {
    practice_project_id: pid,
    template_type: row.template_type,
    items: row.items ?? [],
    auto_apply_to_new_stories: row.auto_apply_to_new_stories ?? false,
    is_active: row.is_active !== false,
    created_by_user_id: row.created_by_user_id ?? null,
    updated_at: new Date().toISOString(),
  }
  if (existing?.id) {
    const { data, error } = await simDb.from('project_agile_templates').update(payload).eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await simDb.from('project_agile_templates').insert(payload).select().single()
  if (error) throw error
  return data
}
