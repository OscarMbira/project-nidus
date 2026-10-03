import { platformDb } from '@nidus/supabase'

export async function getGovernanceMembers(projectId, bodyType) {
  const { data, error } = await platformDb
    .from('project_governance_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('body_type', bodyType)
    .eq('is_deleted', false)
    .order('is_chair', { ascending: false })
    .order('member_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createGovernanceMember(projectId, bodyType, fields, userId) {
  const { data, error } = await platformDb
    .from('project_governance_members')
    .insert({
      project_id: projectId,
      body_type: bodyType,
      member_name: fields.member_name,
      role_title: fields.role_title || null,
      organisation: fields.organisation || null,
      email: fields.email || null,
      phone: fields.phone || null,
      is_chair: !!fields.is_chair,
      appointed_date: fields.appointed_date || null,
      end_date: fields.end_date || null,
      notes: fields.notes || null,
      created_by: userId || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateGovernanceMember(id, fields, userId) {
  const { data, error } = await platformDb
    .from('project_governance_members')
    .update({
      member_name: fields.member_name,
      role_title: fields.role_title || null,
      organisation: fields.organisation || null,
      email: fields.email || null,
      phone: fields.phone || null,
      is_chair: !!fields.is_chair,
      appointed_date: fields.appointed_date || null,
      end_date: fields.end_date || null,
      notes: fields.notes || null,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteGovernanceMember(id) {
  const { error } = await platformDb
    .from('project_governance_members')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
