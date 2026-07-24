/**
 * Exception Report Options Service
 * Manages options analysis for exception reports
 */

import { supabase } from './supabaseClient'

/**
 * Add Option
 * @param {string} reportId - Report ID
 * @param {Object} optionData - Option data
 * @returns {Promise<Object>} Created option
 */
export async function addOption(reportId, optionData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get next option number
    const { data: existingOptions } = await supabase
      .from('exception_report_options')
      .select('option_number')
      .eq('exception_report_id', reportId)
      .order('option_number', { ascending: false })
      .limit(1)

    const nextOptionNumber = existingOptions && existingOptions.length > 0
      ? existingOptions[0].option_number + 1
      : 1

    const insertData = {
      exception_report_id: reportId,
      option_number: optionData.option_number || nextOptionNumber,
      option_title: optionData.option_title || `Option ${nextOptionNumber}`,
      option_description: optionData.option_description || '',
      effect_on_business_case: optionData.effect_on_business_case || null,
      effect_on_time_tolerance: optionData.effect_on_time_tolerance || null,
      effect_on_cost_tolerance: optionData.effect_on_cost_tolerance || null,
      effect_on_scope_tolerance: optionData.effect_on_scope_tolerance || null,
      effect_on_quality_tolerance: optionData.effect_on_quality_tolerance || null,
      effect_on_benefits: optionData.effect_on_benefits || null,
      revised_end_date: optionData.revised_end_date || null,
      revised_budget: optionData.revised_budget || null,
      additional_time_required: optionData.additional_time_required || null,
      additional_cost_required: optionData.additional_cost_required || null,
      associated_risks: optionData.associated_risks || null,
      risk_level: optionData.risk_level || null,
      risk_mitigation: optionData.risk_mitigation || null,
      pros: optionData.pros || [],
      cons: optionData.cons || [],
      feasibility_rating: optionData.feasibility_rating || null,
      is_recommended: optionData.is_recommended || false,
      display_order: optionData.display_order || nextOptionNumber - 1
    }

    // If this is set as recommended, unset others
    if (insertData.is_recommended) {
      await supabase
        .from('exception_report_options')
        .update({ is_recommended: false })
        .eq('exception_report_id', reportId)
        .neq('option_number', insertData.option_number)
    }

    const { data, error } = await supabase
      .from('exception_report_options')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding option:', error)
    throw error
  }
}

/**
 * Update Option
 * @param {string} optionId - Option ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated option
 */
export async function updateOption(optionId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // If setting as recommended, unset others
    if (updates.is_recommended === true) {
      const { data: option } = await supabase
        .from('exception_report_options')
        .select('exception_report_id, option_number')
        .eq('id', optionId)
        .single()

      if (option) {
        await supabase
          .from('exception_report_options')
          .update({ is_recommended: false })
          .eq('exception_report_id', option.exception_report_id)
          .neq('option_number', option.option_number)
      }
    }

    const { data, error } = await supabase
      .from('exception_report_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating option:', error)
    throw error
  }
}

/**
 * Delete Option
 * @param {string} optionId - Option ID
 * @returns {Promise<void>}
 */
export async function deleteOption(optionId) {
  try {
    const { error } = await supabase
      .from('exception_report_options')
      .delete()
      .eq('id', optionId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting option:', error)
    throw error
  }
}

/**
 * Set Recommended Option
 * @param {string} reportId - Report ID
 * @param {number} optionNumber - Option number to recommend
 * @returns {Promise<Object>} Updated option
 */
export async function setRecommendedOption(reportId, optionNumber) {
  try {
    // Unset all recommended options
    await supabase
      .from('exception_report_options')
      .update({ is_recommended: false })
      .eq('exception_report_id', reportId)

    // Set the specified option as recommended
    const { data, error } = await supabase
      .from('exception_report_options')
      .update({ is_recommended: true })
      .eq('exception_report_id', reportId)
      .eq('option_number', optionNumber)
      .select()
      .single()

    if (error) throw error

    // Update report with recommended option number
    await supabase
      .from('exception_reports')
      .update({ recommended_option_number: optionNumber })
      .eq('id', reportId)

    return data
  } catch (error) {
    console.error('Error setting recommended option:', error)
    throw error
  }
}

/**
 * Get Options
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Options list
 */
export async function getOptions(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_options')
      .select('*')
      .eq('exception_report_id', reportId)
      .order('option_number', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting options:', error)
    throw error
  }
}

/**
 * Get Options Comparison
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Options with comparison data
 */
export async function getOptionsComparison(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_options')
      .select('*')
      .eq('exception_report_id', reportId)
      .order('option_number', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting options comparison:', error)
    throw error
  }
}
