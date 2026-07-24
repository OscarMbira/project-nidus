/**
 * PSA Quality Checks Service
 * API functions for managing quality checks in Product Status Accounts
 */

import { supabase } from './supabaseClient'

/**
 * Add quality check to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {Object} qualityCheckData - Quality check data
 * @returns {Promise<Object>} Created quality check
 */
export async function addQualityCheck(psaId, qualityCheckData) {
  try {
    const { data, error } = await supabase
      .from('psa_quality_checks')
      .insert({
        ...qualityCheckData,
        product_status_account_id: psaId
      })
      .select()
      .single()

    if (error) throw error

    // Update PSA quality status
    if (qualityCheckData.quality_status) {
      await supabase
        .from('product_status_accounts')
        .update({
          quality_status: qualityCheckData.quality_status,
          quality_review_date: qualityCheckData.quality_check_date || new Date().toISOString().split('T')[0],
          quality_reviewer_id: qualityCheckData.checked_by_id
        })
        .eq('id', psaId)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error adding quality check:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update quality check
 * @param {string} checkId - Quality check ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated quality check
 */
export async function updateQualityCheck(checkId, updates) {
  try {
    const { data, error } = await supabase
      .from('psa_quality_checks')
      .update(updates)
      .eq('id', checkId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating quality check:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get quality checks for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Quality checks array
 */
export async function getQualityChecks(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_quality_checks')
      .select(`
        *,
        checked_by:checked_by_id(id, full_name, email)
      `)
      .eq('product_status_account_id', psaId)
      .order('quality_check_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting quality checks:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get latest quality check for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Latest quality check
 */
export async function getLatestQualityCheck(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_quality_checks')
      .select(`
        *,
        checked_by:checked_by_id(id, full_name, email)
      `)
      .eq('product_status_account_id', psaId)
      .order('quality_check_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error getting latest quality check:', error)
    return { success: false, error: error.message }
  }
}
