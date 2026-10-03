import { platformDb } from '@nidus/supabase'

export async function getProjectContacts(projectId) {
  const { data, error } = await platformDb
    .from('project_contacts')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('contact_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getProjectContact(id) {
  const { data, error } = await platformDb
    .from('project_contacts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createProjectContact(projectId, fields, userId) {
  const { data, error } = await platformDb
    .from('project_contacts')
    .insert({
      project_id: projectId,
      contact_name: fields.contact_name,
      role_title: fields.role_title || null,
      organisation: fields.organisation || null,
      contact_type: fields.contact_type || null,
      email: fields.email || null,
      phone: fields.phone || null,
      address: fields.address || null,
      primary_email: fields.primary_email || null,
      primary_phone: fields.primary_phone || null,
      primary_address: fields.primary_address || null,
      notes: fields.notes || null,
      created_by: userId || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateProjectContact(id, fields, userId) {
  const { data, error } = await platformDb
    .from('project_contacts')
    .update({
      contact_name: fields.contact_name,
      role_title: fields.role_title || null,
      organisation: fields.organisation || null,
      contact_type: fields.contact_type || null,
      email: fields.email || null,
      phone: fields.phone || null,
      address: fields.address || null,
      primary_email: fields.primary_email || null,
      primary_phone: fields.primary_phone || null,
      primary_address: fields.primary_address || null,
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

export async function deleteProjectContact(id) {
  const { error } = await platformDb
    .from('project_contacts')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
