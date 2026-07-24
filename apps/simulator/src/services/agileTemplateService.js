import { platformDb } from './supabase/supabaseClient'

export async function listTemplates(projectId) {
  const { data, error } = await platformDb
    .from('project_agile_templates')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function upsertTemplate(row) {
  const { data: existing } = await platformDb
    .from('project_agile_templates')
    .select('id')
    .eq('project_id', row.project_id)
    .eq('template_type', row.template_type)
    .eq('is_deleted', false)
    .maybeSingle()
  if (existing?.id) {
    const { data, error } = await platformDb.from('project_agile_templates').update(row).eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb.from('project_agile_templates').insert(row).select().single()
  if (error) throw error
  return data
}

