/**
 * QMS Quality Reports Service
 * API functions for managing quality reports
 */

import { supabase } from './supabaseClient'

/**
 * Add quality report
 * @param {string} qmsId - QMS ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function addReport(qmsId, reportData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next display order
    const { data: existing } = await supabase
      .from('qms_reports')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...reportData,
      qms_id: qmsId,
      display_order: reportData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_reports')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality report:', error)
    throw error
  }
}

/**
 * Update quality report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated report
 */
export async function updateReport(reportId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_reports')
      .update(updateData)
      .eq('id', reportId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality report:', error)
    throw error
  }
}

/**
 * Delete quality report
 * @param {string} reportId - Report ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteReport(reportId) {
  try {
    const { error } = await supabase
      .from('qms_reports')
      .delete()
      .eq('id', reportId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality report:', error)
    throw error
  }
}

/**
 * Get quality reports for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality reports
 */
export async function getReports(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_reports')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality reports:', error)
    throw error
  }
}

/**
 * Get quality reports by frequency
 * @param {string} qmsId - QMS ID
 * @param {string} frequency - Report frequency
 * @returns {Promise<Array>} Reports with specified frequency
 */
export async function getReportsByFrequency(qmsId, frequency) {
  try {
    const { data, error } = await supabase
      .from('qms_reports')
      .select('*')
      .eq('qms_id', qmsId)
      .eq('frequency', frequency)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching reports by frequency:', error)
    throw error
  }
}

export default {
  addReport,
  updateReport,
  deleteReport,
  getReports,
  getReportsByFrequency
}
