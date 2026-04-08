/**
 * End Project Report Products Review Service
 * Manages quality records, approval records, and off-specifications
 */

import { supabase } from './supabaseClient'

/**
 * Add Quality Record
 * @param {string} reportId - Report ID
 * @param {Object} recordData - Quality record data
 * @returns {Promise<Object>} Created quality record
 */
export async function addQualityRecord(reportId, recordData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_project_report_id: reportId,
      activity_name: recordData.activity_name,
      activity_type: recordData.activity_type,
      product_id: recordData.product_id || null,
      product_name: recordData.product_name || null,
      planned_date: recordData.planned_date || null,
      actual_date: recordData.actual_date || null,
      status: recordData.status || 'planned',
      result: recordData.result || null,
      findings_summary: recordData.findings_summary || null,
      actions_taken: recordData.actions_taken || null,
      reviewer_id: recordData.reviewer_id || userData.user.id,
      display_order: recordData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_quality_records')
      .insert(insertData)
      .select(`
        *,
        reviewer:reviewer_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding quality record:', error)
    throw error
  }
}

/**
 * Update Quality Record
 * @param {string} recordId - Quality record ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated quality record
 */
export async function updateQualityRecord(recordId, updates) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_quality_records')
      .update(updates)
      .eq('id', recordId)
      .select(`
        *,
        reviewer:reviewer_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating quality record:', error)
    throw error
  }
}

/**
 * Delete Quality Record
 * @param {string} recordId - Quality record ID
 * @returns {Promise<void>}
 */
export async function deleteQualityRecord(recordId) {
  try {
    const { error } = await supabase
      .from('end_project_report_quality_records')
      .delete()
      .eq('id', recordId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting quality record:', error)
    throw error
  }
}

/**
 * Add Approval Record
 * @param {string} reportId - Report ID
 * @param {Object} recordData - Approval record data
 * @returns {Promise<Object>} Created approval record
 */
export async function addApprovalRecord(reportId, recordData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get approver details
    const approverId = recordData.approver_id || userData.user.id
    const { data: approver } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', approverId)
      .single()

    const insertData = {
      end_project_report_id: reportId,
      product_id: recordData.product_id || null,
      product_name: recordData.product_name,
      product_description: recordData.product_description || null,
      approval_status: recordData.approval_status,
      approver_id: approverId,
      approver_name: approver?.full_name || approver?.email,
      approval_date: recordData.approval_date || new Date().toISOString().split('T')[0],
      conditions: recordData.conditions || null,
      rejection_reason: recordData.rejection_reason || null,
      evidence_reference: recordData.evidence_reference || null,
      display_order: recordData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_approval_records')
      .insert(insertData)
      .select(`
        *,
        approver:approver_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding approval record:', error)
    throw error
  }
}

/**
 * Update Approval Record
 * @param {string} recordId - Approval record ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated approval record
 */
export async function updateApprovalRecord(recordId, updates) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_approval_records')
      .update(updates)
      .eq('id', recordId)
      .select(`
        *,
        approver:approver_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating approval record:', error)
    throw error
  }
}

/**
 * Add Off-Specification
 * @param {string} reportId - Report ID
 * @param {Object} offSpecData - Off-specification data
 * @returns {Promise<Object>} Created off-specification
 */
export async function addOffSpecification(reportId, offSpecData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_project_report_id: reportId,
      off_spec_type: offSpecData.off_spec_type,
      product_id: offSpecData.product_id || null,
      product_name: offSpecData.product_name || null,
      original_requirement: offSpecData.original_requirement,
      actual_delivery: offSpecData.actual_delivery || null,
      deviation_description: offSpecData.deviation_description,
      impact_assessment: offSpecData.impact_assessment || null,
      concession_granted: offSpecData.concession_granted || false,
      concession_reference: offSpecData.concession_reference || null,
      concession_granted_by: offSpecData.concession_granted_by || null,
      concession_date: offSpecData.concession_date || null,
      concession_conditions: offSpecData.concession_conditions || null,
      follow_on_action_required: offSpecData.follow_on_action_required || false,
      follow_on_action_id: offSpecData.follow_on_action_id || null,
      display_order: offSpecData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_off_specifications')
      .insert(insertData)
      .select(`
        *,
        product:product_id(id, product_name),
        concession_granted_by_user:concession_granted_by(id, full_name, email),
        follow_on_action:follow_on_action_id(id, action_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding off-specification:', error)
    throw error
  }
}

/**
 * Update Off-Specification
 * @param {string} offSpecId - Off-specification ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated off-specification
 */
export async function updateOffSpecification(offSpecId, updates) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_off_specifications')
      .update(updates)
      .eq('id', offSpecId)
      .select(`
        *,
        product:product_id(id, product_name),
        concession_granted_by_user:concession_granted_by(id, full_name, email),
        follow_on_action:follow_on_action_id(id, action_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating off-specification:', error)
    throw error
  }
}

/**
 * Grant Concession
 * @param {string} offSpecId - Off-specification ID
 * @param {Object} concessionData - Concession data
 * @returns {Promise<Object>} Updated off-specification
 */
export async function grantConcession(offSpecId, concessionData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const updates = {
      concession_granted: true,
      concession_reference: concessionData.concession_reference || null,
      concession_granted_by: userData.user.id,
      concession_date: concessionData.concession_date || new Date().toISOString().split('T')[0],
      concession_conditions: concessionData.concession_conditions || null
    }

    return await updateOffSpecification(offSpecId, updates)
  } catch (error) {
    console.error('Error granting concession:', error)
    throw error
  }
}

/**
 * Get Quality Records
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality records
 */
export async function getQualityRecords(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_quality_records')
      .select(`
        *,
        reviewer:reviewer_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching quality records:', error)
    throw error
  }
}

/**
 * Get Approval Records
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Approval records
 */
export async function getApprovalRecords(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_approval_records')
      .select(`
        *,
        approver:approver_id(id, full_name, email),
        product:product_id(id, product_name)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching approval records:', error)
    throw error
  }
}

/**
 * Get Off-Specifications
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Off-specifications
 */
export async function getOffSpecifications(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_off_specifications')
      .select(`
        *,
        product:product_id(id, product_name),
        concession_granted_by_user:concession_granted_by(id, full_name, email),
        follow_on_action:follow_on_action_id(id, action_title)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching off-specifications:', error)
    throw error
  }
}
