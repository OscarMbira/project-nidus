/**
 * PSA Acceptance Checks Service
 * API functions for managing acceptance checks in Product Status Accounts
 */

import { supabase } from './supabaseClient'

/**
 * Add acceptance check to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {Object} acceptanceCheckData - Acceptance check data
 * @returns {Promise<Object>} Created acceptance check
 */
export async function addAcceptanceCheck(psaId, acceptanceCheckData) {
  try {
    const { data, error } = await supabase
      .from('psa_acceptance_checks')
      .insert({
        ...acceptanceCheckData,
        product_status_account_id: psaId
      })
      .select()
      .single()

    if (error) throw error

    // Update PSA acceptance status if provided
    if (acceptanceCheckData.acceptance_status) {
      await supabase
        .from('product_status_accounts')
        .update({
          acceptance_status: acceptanceCheckData.acceptance_status,
          acceptance_date: acceptanceCheckData.acceptance_check_date || new Date().toISOString().split('T')[0],
          accepted_by_id: acceptanceCheckData.checked_by_id
        })
        .eq('id', psaId)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error adding acceptance check:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update acceptance check
 * @param {string} checkId - Acceptance check ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated acceptance check
 */
export async function updateAcceptanceCheck(checkId, updates) {
  try {
    const { data, error } = await supabase
      .from('psa_acceptance_checks')
      .update(updates)
      .eq('id', checkId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating acceptance check:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get acceptance checks for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Acceptance checks array
 */
export async function getAcceptanceChecks(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_acceptance_checks')
      .select(`
        *,
        checked_by:checked_by_id(id, full_name, email),
        acceptance_criterion:acceptance_criterion_id(id, criteria_title, criteria_description)
      `)
      .eq('product_status_account_id', psaId)
      .order('acceptance_check_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting acceptance checks:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get latest acceptance check for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Latest acceptance check
 */
export async function getLatestAcceptanceCheck(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_acceptance_checks')
      .select(`
        *,
        checked_by:checked_by_id(id, full_name, email),
        acceptance_criterion:acceptance_criterion_id(id, criteria_title)
      `)
      .eq('product_status_account_id', psaId)
      .order('acceptance_check_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error getting latest acceptance check:', error)
    return { success: false, error: error.message }
  }
}
