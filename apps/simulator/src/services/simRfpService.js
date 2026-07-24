/**
 * Simulator RFP Service
 * Mirrors rfpService but uses simDb (sim schema) for practice/simulation data.
 * Role checks use platformDb (public.user_roles).
 */

import { simDb } from './supabase/supabaseClient'
import { supabase } from './supabaseClient'

async function checkPMOAdminRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // user_roles.user_id stores the internal users.id, not auth.uid()
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!userRecord) return false

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_id, roles:role_id (role_name)')
    .eq('user_id', userRecord.id)
    .eq('is_active', true)
    .eq('is_deleted', false)
  if (error || !data) return false
  const adminRoles = ['pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin']
  return data.some(ur => ur.roles && adminRoles.includes(ur.roles.role_name))
}

async function enforcePMOAdmin() {
  const isPMO = await checkPMOAdminRole()
  if (!isPMO) throw new Error('Access denied: Only PMO Administrators can perform this action.')
}

export async function generateRFPReference(organisationId) {
  const year = new Date().getFullYear()
  const prefix = `RFP-SIM-${year}-`
  const { data, error } = await simDb
    .from('rfp_documents')
    .select('rfp_reference')
    .eq('organisation_id', organisationId)
    .like('rfp_reference', `${prefix}%`)
    .order('rfp_reference', { ascending: false })
    .limit(1)
  if (error) throw error
  let nextNumber = 1
  if (data?.length) {
    const lastRef = data[0].rfp_reference
    const lastNumber = parseInt(lastRef.replace(prefix, ''), 10)
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1
  }
  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

export async function getRFPList(filters = {}) {
  let query = simDb.from('rfp_documents').select('*').eq('is_deleted', false)
  if (filters.organisation_id) query = query.eq('organisation_id', filters.organisation_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.rfp_category) query = query.eq('rfp_category', filters.rfp_category)
  if (filters.search) {
    query = query.or(`rfp_title.ilike.%${filters.search}%,rfp_reference.ilike.%${filters.search}%,service_provider_name.ilike.%${filters.search}%,rfp_description.ilike.%${filters.search}%`)
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getRFPById(rfpId) {
  const { data, error } = await simDb.from('rfp_documents').select('*').eq('id', rfpId).eq('is_deleted', false).single()
  if (error) throw error
  return data
}

export async function createRFP(rfpData) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const insertData = { ...rfpData, created_by: user.id, updated_by: user.id }
  if (!insertData.rfp_reference && insertData.organisation_id) {
    insertData.rfp_reference = await generateRFPReference(insertData.organisation_id)
  }
  const { data, error } = await simDb.from('rfp_documents').insert(insertData).select().single()
  if (error) throw error
  return data
}

export async function updateRFP(rfpId, rfpData) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data, error } = await simDb.from('rfp_documents').update({ ...rfpData, updated_by: user.id }).eq('id', rfpId).eq('is_deleted', false).select().single()
  if (error) throw error
  return data
}

export async function deleteRFP(rfpId) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data, error } = await simDb.from('rfp_documents').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', rfpId).select().single()
  if (error) throw error
  return data
}

export async function updateRFPStatus(rfpId, newStatus) {
  await enforcePMOAdmin()
  const validTransitions = { draft: ['active'], active: ['closed', 'on_hold'], on_hold: ['active'], closed: [] }
  const { data: current, error: fetchError } = await simDb.from('rfp_documents').select('status').eq('id', rfpId).eq('is_deleted', false).single()
  if (fetchError) throw fetchError
  const allowed = validTransitions[current.status] || []
  if (!allowed.includes(newStatus)) throw new Error(`Cannot change status from "${current.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`)
  return updateRFP(rfpId, { status: newStatus, document_state: newStatus })
}

export async function getLineItems(rfpId, filters = {}) {
  let query = simDb.from('rfp_line_items').select('*').eq('rfp_id', rfpId).eq('is_deleted', false)
  if (filters.business_area) query = query.eq('business_area', filters.business_area)
  if (filters.scope_entity) query = query.eq('scope_entity', filters.scope_entity)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.search) query = query.or(`description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%,vendor_response.ilike.%${filters.search}%`)
  const sortField = filters.sort_by || 'item_number'
  const { data, error } = await query.order(sortField, { ascending: true })
  if (error) throw error
  return data
}

export async function createLineItem(lineItemData) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const insertData = { ...lineItemData, created_by: user.id, updated_by: user.id, sort_order: lineItemData.sort_order ?? lineItemData.item_number }
  const { data, error } = await simDb.from('rfp_line_items').insert(insertData).select().single()
  if (error) throw error
  return data
}

export async function updateLineItem(lineItemId, lineItemData) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data, error } = await simDb.from('rfp_line_items').update({ ...lineItemData, updated_by: user.id }).eq('id', lineItemId).eq('is_deleted', false).select().single()
  if (error) throw error
  return data
}

export async function deleteLineItem(lineItemId) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data, error } = await simDb.from('rfp_line_items').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', lineItemId).select().single()
  if (error) throw error
  return data
}

export async function batchCreateLineItems(rfpId, lineItemsArray) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const insertData = lineItemsArray.map((item, i) => ({
    ...item,
    rfp_id: rfpId,
    created_by: user.id,
    updated_by: user.id,
    sort_order: item.sort_order ?? item.item_number ?? (i + 1),
  }))
  const { data, error } = await simDb.from('rfp_line_items').insert(insertData).select()
  if (error) throw error
  return data
}

export async function getAttachments(rfpId) {
  const { data, error } = await simDb.from('rfp_attachments').select('*').eq('rfp_id', rfpId).eq('is_deleted', false).order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteAttachment(attachmentId) {
  await enforcePMOAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data, error } = await simDb.from('rfp_attachments').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', attachmentId).select().single()
  if (error) throw error
  return data
}

export async function getRFPStats(organisationId) {
  const { data, error } = await simDb.from('rfp_documents').select('id, status, total_line_items').eq('organisation_id', organisationId).eq('is_deleted', false)
  if (error) throw error
  const stats = { total: data.length, draft: 0, active: 0, closed: 0, on_hold: 0, total_line_items: 0 }
  data.forEach(rfp => {
    if (stats[rfp.status] !== undefined) stats[rfp.status]++
    stats.total_line_items += rfp.total_line_items || 0
  })
  return stats
}

export { checkPMOAdminRole }
