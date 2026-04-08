/**
 * End Project Report Quality Check Service
 * Manages quality criteria validation
 */

import { supabase } from './supabaseClient'

/**
 * Run Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality check results
 */
export async function runQualityChecks(reportId) {
  try {
    const { data, error } = await supabase.rpc('run_epr_quality_checks', {
      p_end_project_report_id: reportId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error running quality checks:', error)
    throw error
  }
}

/**
 * Get Quality Check Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality status
 */
export async function getQualityCheckStatus(reportId) {
  try {
    const { data, error } = await supabase.rpc('get_epr_quality_summary', {
      p_end_project_report_id: reportId
    })

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching quality check status:', error)
    throw error
  }
}

/**
 * Get Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality checks
 */
export async function getQualityChecks(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_quality_checks')
      .select(`
        *,
        checked_by_user:checked_by(id, full_name, email)
      `)
      .eq('end_project_report_id', reportId)
      .order('criterion_number', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching quality checks:', error)
    throw error
  }
}

/**
 * Update Quality Check
 * @param {string} checkId - Quality check ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated quality check
 */
export async function updateQualityCheck(checkId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const updateData = {
      ...updates,
      checked_by: userData.user.id,
      checked_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('end_project_report_quality_checks')
      .update(updateData)
      .eq('id', checkId)
      .select(`
        *,
        checked_by_user:checked_by(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating quality check:', error)
    throw error
  }
}

/**
 * Can Close Project
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Whether project can be closed
 */
export async function canCloseProject(reportId) {
  try {
    const status = await getQualityCheckStatus(reportId)
    return status?.can_close_project || false
  } catch (error) {
    console.error('Error checking if can close project:', error)
    return false
  }
}

/**
 * Override Quality Check
 * @param {string} checkId - Quality check ID
 * @param {string} reason - Override reason
 * @returns {Promise<Object>} Updated quality check
 */
export async function overrideQualityCheck(checkId, reason) {
  try {
    return await updateQualityCheck(checkId, {
      validation_status: 'manual_override',
      override_reason: reason
    })
  } catch (error) {
    console.error('Error overriding quality check:', error)
    throw error
  }
}
