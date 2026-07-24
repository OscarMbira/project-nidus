/**
 * Risk Response Service
 * Provides risk response action management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get responses for a risk
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Responses data
 */
export async function getResponsesByRisk(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risk_responses')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('risk_id', riskId)
      .order('response_number', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching risk responses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a response action for a risk
 * @param {Object} responseData - Response data
 * @returns {Promise<Object>} Created response
 */
export async function createResponse(responseData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Get next response number
    const { data: existing } = await platformDb
      .from('risk_responses')
      .select('response_number')
      .eq('risk_id', responseData.risk_id)
      .order('response_number', { ascending: false })
      .limit(1)
      .single();

    const responseNumber = existing ? existing.response_number + 1 : 1;

    const { data, error } = await platformDb
      .from('risk_responses')
      .insert({
        ...responseData,
        response_number: responseNumber,
        created_by: userRecord.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating response:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a response
 * @param {string} responseId - Response ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated response
 */
export async function updateResponse(responseId, updates) {
  try {
    const { data, error } = await platformDb
      .from('risk_responses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating response:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a response
 * @param {string} responseId - Response ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteResponse(responseId) {
  try {
    const { error } = await platformDb
      .from('risk_responses')
      .delete()
      .eq('id', responseId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting response:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete a response
 * @param {string} responseId - Response ID
 * @param {string} notes - Completion notes
 * @returns {Promise<Object>} Update result
 */
export async function completeResponse(responseId, notes = null) {
  try {
    const { data, error } = await platformDb
      .from('risk_responses')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        completion_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error completing response:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assess response effectiveness
 * @param {string} responseId - Response ID
 * @param {string} rating - Effectiveness rating
 * @param {string} notes - Assessment notes
 * @returns {Promise<Object>} Update result
 */
export async function assessEffectiveness(responseId, rating, notes = null) {
  try {
    const { data, error } = await platformDb
      .from('risk_responses')
      .update({
        effectiveness_rating: rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error assessing effectiveness:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending responses for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Pending responses
 */
export async function getPendingResponses(projectId) {
  try {
    // Get risk register
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: [] };
    }

    // Get risks for this register
    const { data: risks } = await platformDb
      .from('risks')
      .select('id')
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false);

    if (!risks || risks.length === 0) {
      return { success: true, data: [] };
    }

    const riskIds = risks.map(r => r.id);

    const { data, error } = await platformDb
      .from('risk_responses')
      .select(`
        *,
        risk:risk_id(id, risk_identifier, risk_title, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .in('risk_id', riskIds)
      .in('status', ['planned', 'in_progress'])
      .order('target_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching pending responses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get overdue responses for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Overdue responses
 */
export async function getOverdueResponses(projectId) {
  try {
    // Get risk register
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: [] };
    }

    // Get risks for this register
    const { data: risks } = await platformDb
      .from('risks')
      .select('id')
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false);

    if (!risks || risks.length === 0) {
      return { success: true, data: [] };
    }

    const riskIds = risks.map(r => r.id);

    const { data, error } = await platformDb
      .from('risk_responses')
      .select(`
        *,
        risk:risk_id(id, risk_identifier, risk_title, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .in('risk_id', riskIds)
      .in('status', ['planned', 'in_progress'])
      .lt('target_date', new Date().toISOString().split('T')[0])
      .order('target_date', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching overdue responses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get responses assigned to a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's responses
 */
export async function getMyResponses(userId) {
  try {
    const { data, error } = await platformDb
      .from('risk_responses')
      .select(`
        *,
        risk:risk_id(id, risk_identifier, risk_title, project_id)
      `)
      .eq('assigned_to_id', userId)
      .in('status', ['planned', 'in_progress'])
      .order('target_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return { success: false, error: error.message };
  }
}
