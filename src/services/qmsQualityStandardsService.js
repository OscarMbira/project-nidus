/**
 * QMS Quality Standards Service
 * API functions for managing quality standards
 */

import { supabase } from './supabaseClient'

/**
 * Add quality standard
 * @param {string} qmsId - QMS ID
 * @param {Object} standardData - Standard data
 * @returns {Promise<Object>} Created standard
 */
export async function addStandard(qmsId, standardData) {
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
      .from('qms_quality_standards')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...standardData,
      qms_id: qmsId,
      display_order: standardData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_quality_standards')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality standard:', error)
    throw error
  }
}

/**
 * Update quality standard
 * @param {string} standardId - Standard ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated standard
 */
export async function updateStandard(standardId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_quality_standards')
      .update(updateData)
      .eq('id', standardId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality standard:', error)
    throw error
  }
}

/**
 * Delete quality standard
 * @param {string} standardId - Standard ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteStandard(standardId) {
  try {
    const { error } = await supabase
      .from('qms_quality_standards')
      .delete()
      .eq('id', standardId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality standard:', error)
    throw error
  }
}

/**
 * Get quality standards for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality standards
 */
export async function getStandards(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_quality_standards')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality standards:', error)
    throw error
  }
}

/**
 * Get applicable standards for organization
 * @param {string} organisationId - Organization/Account ID
 * @returns {Promise<Array>} Applicable standards
 */
export async function getApplicableStandards(organisationId) {
  try {
    // This would typically fetch from organization-level standards/templates
    // For now, return common standards
    const commonStandards = [
      { code: 'ISO 9001', name: 'ISO 9001:2015 Quality Management Systems', type: 'international' },
      { code: 'ISO 27001', name: 'ISO 27001:2013 Information Security Management', type: 'international' },
      { code: 'ISO 14001', name: 'ISO 14001:2015 Environmental Management Systems', type: 'international' },
      { code: 'ISO 20000', name: 'ISO 20000 IT Service Management', type: 'international' },
      { code: 'CMMI', name: 'Capability Maturity Model Integration', type: 'industry' }
    ]

    return commonStandards
  } catch (error) {
    console.error('Error fetching applicable standards:', error)
    throw error
  }
}

export default {
  addStandard,
  updateStandard,
  deleteStandard,
  getStandards,
  getApplicableStandards
}
