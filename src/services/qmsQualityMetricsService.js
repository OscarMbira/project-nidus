/**
 * QMS Quality Metrics Service
 * API functions for managing quality metrics
 */

import { supabase } from './supabaseClient'

/**
 * Add quality metric
 * @param {string} qmsId - QMS ID
 * @param {Object} metricData - Metric data
 * @returns {Promise<Object>} Created metric
 */
export async function addMetric(qmsId, metricData) {
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
      .from('qms_quality_metrics')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...metricData,
      qms_id: qmsId,
      display_order: metricData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_quality_metrics')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality metric:', error)
    throw error
  }
}

/**
 * Update quality metric
 * @param {string} metricId - Metric ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated metric
 */
export async function updateMetric(metricId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_quality_metrics')
      .update(updateData)
      .eq('id', metricId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality metric:', error)
    throw error
  }
}

/**
 * Delete quality metric
 * @param {string} metricId - Metric ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteMetric(metricId) {
  try {
    const { error } = await supabase
      .from('qms_quality_metrics')
      .delete()
      .eq('id', metricId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality metric:', error)
    throw error
  }
}

/**
 * Get quality metrics for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality metrics
 */
export async function getMetrics(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_quality_metrics')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality metrics:', error)
    throw error
  }
}

/**
 * Get quality metrics by category
 * @param {string} qmsId - QMS ID
 * @param {string} category - Metric category
 * @returns {Promise<Array>} Metrics in category
 */
export async function getMetricsByCategory(qmsId, category) {
  try {
    const { data, error } = await supabase
      .from('qms_quality_metrics')
      .select('*')
      .eq('qms_id', qmsId)
      .eq('metric_category', category)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching metrics by category:', error)
    throw error
  }
}

export default {
  addMetric,
  updateMetric,
  deleteMetric,
  getMetrics,
  getMetricsByCategory
}
