/**
 * Risk Register Service
 * Provides risk register management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a risk register for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created risk register
 */
export async function createRiskRegister(projectId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Call database function to create register (handles duplicate check)
    const { data, error } = await platformDb.rpc('create_risk_register_for_project', {
      p_project_id: projectId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created register
    const { data: register, error: fetchError } = await platformDb
      .from('risk_registers')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) throw fetchError;

    return { success: true, data: register };
  } catch (error) {
    console.error('Error creating risk register:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk register by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Risk register data
 */
export async function getRiskRegisterByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('risk_registers')
      .select(`
        *,
        projects:project_id(id, project_name, project_code),
        programmes:programme_id(id, programme_name)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      // Register doesn't exist yet - return null
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching risk register:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk register by ID
 * @param {string} registerId - Risk register ID
 * @returns {Promise<Object>} Risk register data
 */
export async function getRiskRegisterById(registerId) {
  try {
    const { data, error } = await platformDb
      .from('risk_registers')
      .select(`
        *,
        projects:project_id(id, project_name, project_code),
        programmes:programme_id(id, programme_name)
      `)
      .eq('id', registerId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching risk register:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update risk register
 * @param {string} registerId - Risk register ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated register
 */
export async function updateRiskRegister(registerId, updates) {
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

    const { data, error } = await platformDb
      .from('risk_registers')
      .update({
        ...updates,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', registerId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating risk register:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Configure scales for a risk register
 * @param {string} registerId - Risk register ID
 * @param {Object} scales - Scale configuration
 * @returns {Promise<Object>} Update result
 */
export async function configureScales(registerId, scales) {
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

    const { data, error } = await platformDb
      .from('risk_registers')
      .update({
        probability_scale: scales.probability_scale || null,
        impact_scale: scales.impact_scale || null,
        risk_matrix_config: scales.risk_matrix_config || null,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', registerId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error configuring scales:', error);
    return { success: false, error: error.message };
  }
}
