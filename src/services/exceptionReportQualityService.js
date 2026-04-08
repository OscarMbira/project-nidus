/**
 * Exception Report Quality Service
 * Manages quality criteria validation
 */

import { supabase } from './supabaseClient'
import { runQualityChecks, getQualityCheckStatus } from './exceptionReportService'

/**
 * Get Quality Checks
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Quality checks
 */
export async function getQualityChecks(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_quality_checks')
      .select(`
        *,
        checked_by_user:checked_by(id, full_name, email)
      `)
      .eq('exception_report_id', reportId)
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

    const { data, error } = await supabase
      .from('exception_report_quality_checks')
      .update({
        ...updates,
        checked_by: userData.user.id,
        checked_at: new Date().toISOString()
      })
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

/**
 * Get Quality Check Status (re-exported from exceptionReportService for convenience)
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality check summary
 */
export { getQualityCheckStatus } from './exceptionReportService'

/**
 * Run Quality Checks and Update Status
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Quality check summary
 */
export async function runAndUpdateQualityChecks(reportId) {
  try {
    // Run automated checks
    await runQualityChecks(reportId)

    // Get updated summary
    const summary = await getQualityCheckStatus(reportId)
    return summary
  } catch (error) {
    console.error('Error running and updating quality checks:', error)
    throw error
  }
}
