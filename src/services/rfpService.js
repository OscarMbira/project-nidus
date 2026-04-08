import { supabase } from './supabaseClient'

/**
 * RFP Document Register Service
 *
 * Core CRUD operations for RFP documents and line items.
 * PMO Admin: Full CRUD access
 * All Other Roles: Read-only access (enforced at DB level via RLS + service level checks)
 */

// ================================================
// ROLE CHECK HELPER
// ================================================

/**
 * Check if the current user has PMO Admin (or higher) role.
 * Returns true if pmo_admin, system_admin, or super_admin.
 */
export async function checkPMOAdminRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // user_roles.user_id stores the internal users.id, not auth.uid()
  // Resolve the internal ID first
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!userRecord) return false

  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      is_active,
      is_deleted,
      roles:role_id (
        role_name
      )
    `)
    .eq('user_id', userRecord.id)
    .eq('is_active', true)
    .eq('is_deleted', false)

  if (error || !data) return false

  const adminRoles = ['pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin']
  return data.some(ur => ur.roles && adminRoles.includes(ur.roles.role_name))
}

/**
 * Enforce PMO Admin role. Throws if user is not PMO Admin.
 */
async function enforcePMOAdmin() {
  const isPMO = await checkPMOAdminRole()
  if (!isPMO) {
    throw new Error('Access denied: Only PMO Administrators can perform this action.')
  }
}

// ================================================
// RFP REFERENCE NUMBER GENERATION
// ================================================

/**
 * Generate the next RFP reference number for an organisation.
 * Format: RFP-YYYY-NNN (e.g., RFP-2026-001)
 */
export async function generateRFPReference(organisationId) {
  const year = new Date().getFullYear()
  const prefix = `RFP-${year}-`

  const { data, error } = await supabase
    .from('rfp_documents')
    .select('rfp_reference')
    .eq('organisation_id', organisationId)
    .like('rfp_reference', `${prefix}%`)
    .order('rfp_reference', { ascending: false })
    .limit(1)

  if (error) throw error

  let nextNumber = 1
  if (data && data.length > 0) {
    const lastRef = data[0].rfp_reference
    const lastNumber = parseInt(lastRef.replace(prefix, ''), 10)
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

// ================================================
// RFP DOCUMENTS - READ (All Roles)
// ================================================

/**
 * Get all RFP documents with optional filters.
 */
export async function getRFPList(filters = {}) {
  let query = supabase
    .from('rfp_documents')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      programme:programme_id (
        id,
        programme_name
      )
    `)
    .eq('is_deleted', false)

  if (filters.organisation_id) {
    query = query.eq('organisation_id', filters.organisation_id)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.rfp_category) {
    query = query.eq('rfp_category', filters.rfp_category)
  }

  if (filters.search) {
    query = query.or(
      `rfp_title.ilike.%${filters.search}%,rfp_reference.ilike.%${filters.search}%,service_provider_name.ilike.%${filters.search}%,rfp_description.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single RFP document by ID with all related data.
 */
export async function getRFPById(rfpId) {
  const { data, error } = await supabase
    .from('rfp_documents')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      programme:programme_id (
        id,
        programme_name
      )
    `)
    .eq('id', rfpId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

// ================================================
// RFP DOCUMENTS - WRITE (PMO Admin Only)
// ================================================

/**
 * Create a new RFP document. PMO Admin only.
 */
export async function createRFP(rfpData) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const insertData = {
    ...rfpData,
    created_by: user.id,
    updated_by: user.id,
  }

  // Auto-generate reference if not provided
  if (!insertData.rfp_reference && insertData.organisation_id) {
    insertData.rfp_reference = await generateRFPReference(insertData.organisation_id)
  }

  const { data, error } = await supabase
    .from('rfp_documents')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing RFP document. PMO Admin only.
 */
export async function updateRFP(rfpId, rfpData) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...rfpData,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('rfp_documents')
    .update(updateData)
    .eq('id', rfpId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete an RFP document. PMO Admin only.
 */
export async function deleteRFP(rfpId) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('rfp_documents')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', rfpId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update RFP status. PMO Admin only.
 * Validates status transitions: draft->active, active->closed, active->on_hold, on_hold->active
 */
export async function updateRFPStatus(rfpId, newStatus) {
  await enforcePMOAdmin()

  const validTransitions = {
    draft: ['active'],
    active: ['closed', 'on_hold'],
    on_hold: ['active'],
    closed: [],
  }

  // Get current status
  const { data: current, error: fetchError } = await supabase
    .from('rfp_documents')
    .select('status')
    .eq('id', rfpId)
    .eq('is_deleted', false)
    .single()

  if (fetchError) throw fetchError

  const allowed = validTransitions[current.status] || []
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot change status from "${current.status}" to "${newStatus}". Allowed transitions: ${allowed.join(', ') || 'none'}`)
  }

  return updateRFP(rfpId, { status: newStatus, document_state: newStatus })
}

// ================================================
// LINE ITEMS - READ (All Roles)
// ================================================

/**
 * Get all line items for an RFP document.
 */
export async function getLineItems(rfpId, filters = {}) {
  let query = supabase
    .from('rfp_line_items')
    .select('*')
    .eq('rfp_id', rfpId)
    .eq('is_deleted', false)

  if (filters.business_area) {
    query = query.eq('business_area', filters.business_area)
  }

  if (filters.scope_entity) {
    query = query.eq('scope_entity', filters.scope_entity)
  }

  if (filters.priority) {
    query = query.eq('priority', filters.priority)
  }

  if (filters.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%,vendor_response.ilike.%${filters.search}%`
    )
  }

  const sortField = filters.sort_by || 'item_number'
  const { data, error } = await query.order(sortField, { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get a single line item by ID.
 */
export async function getLineItemById(lineItemId) {
  const { data, error } = await supabase
    .from('rfp_line_items')
    .select('*')
    .eq('id', lineItemId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

// ================================================
// LINE ITEMS - WRITE (PMO Admin Only)
// ================================================

/**
 * Create a single line item. PMO Admin only.
 */
export async function createLineItem(lineItemData) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const insertData = {
    ...lineItemData,
    created_by: user.id,
    updated_by: user.id,
  }

  // Auto-assign sort_order if not provided
  if (insertData.sort_order == null) {
    insertData.sort_order = insertData.item_number
  }

  const { data, error } = await supabase
    .from('rfp_line_items')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a single line item. PMO Admin only.
 */
export async function updateLineItem(lineItemId, lineItemData) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...lineItemData,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('rfp_line_items')
    .update(updateData)
    .eq('id', lineItemId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete a line item. PMO Admin only.
 */
export async function deleteLineItem(lineItemId) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('rfp_line_items')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', lineItemId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Batch create multiple line items (used by bulk import). PMO Admin only.
 */
export async function batchCreateLineItems(rfpId, lineItemsArray) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const insertData = lineItemsArray.map((item, index) => ({
    ...item,
    rfp_id: rfpId,
    created_by: user.id,
    updated_by: user.id,
    sort_order: item.sort_order ?? item.item_number ?? (index + 1),
  }))

  const { data, error } = await supabase
    .from('rfp_line_items')
    .insert(insertData)
    .select()

  if (error) throw error
  return data
}

// ================================================
// LOOKUP TABLES - READ (All Roles)
// ================================================

/**
 * Get business areas for an organisation.
 */
export async function getBusinessAreas(organisationId) {
  const { data, error } = await supabase
    .from('rfp_business_areas')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get scope entities for an organisation.
 */
export async function getScopeEntities(organisationId) {
  const { data, error } = await supabase
    .from('rfp_scope_entities')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

// ================================================
// LOOKUP TABLES - WRITE (PMO Admin Only)
// ================================================

/**
 * Save a business area (create or update). PMO Admin only.
 */
export async function saveBusinessArea(areaData, areaId = null) {
  await enforcePMOAdmin()

  if (areaId) {
    const { data, error } = await supabase
      .from('rfp_business_areas')
      .update(areaData)
      .eq('id', areaId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('rfp_business_areas')
      .insert(areaData)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

/**
 * Save a scope entity (create or update). PMO Admin only.
 */
export async function saveScopeEntity(entityData, entityId = null) {
  await enforcePMOAdmin()

  if (entityId) {
    const { data, error } = await supabase
      .from('rfp_scope_entities')
      .update(entityData)
      .eq('id', entityId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('rfp_scope_entities')
      .insert(entityData)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ================================================
// ATTACHMENTS - READ (All Roles)
// ================================================

/**
 * Get all attachments for an RFP document.
 */
export async function getAttachments(rfpId) {
  const { data, error } = await supabase
    .from('rfp_attachments')
    .select('*')
    .eq('rfp_id', rfpId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return data
}

// ================================================
// ATTACHMENTS - WRITE (PMO Admin Only)
// ================================================

/**
 * Create an attachment record. PMO Admin only.
 */
export async function createAttachment(attachmentData) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const insertData = {
    ...attachmentData,
    uploaded_by: user.id,
  }

  const { data, error } = await supabase
    .from('rfp_attachments')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete an attachment. PMO Admin only.
 */
export async function deleteAttachment(attachmentId) {
  await enforcePMOAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('rfp_attachments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', attachmentId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// STATISTICS (All Roles)
// ================================================

/**
 * Get RFP statistics for dashboard cards.
 */
export async function getRFPStats(organisationId) {
  const { data, error } = await supabase
    .from('rfp_documents')
    .select('id, status, total_line_items')
    .eq('organisation_id', organisationId)
    .eq('is_deleted', false)

  if (error) throw error

  const stats = {
    total: data.length,
    draft: 0,
    active: 0,
    closed: 0,
    on_hold: 0,
    total_line_items: 0,
  }

  data.forEach(rfp => {
    if (stats[rfp.status] !== undefined) {
      stats[rfp.status]++
    }
    stats.total_line_items += rfp.total_line_items || 0
  })

  return stats
}
