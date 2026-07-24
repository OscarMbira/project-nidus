/**
 * Lessons Log Service
 * Provides lessons log management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a lessons log for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created lessons log
 */
export async function createLessonsLog(projectId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user ID from users table
    const { data: userRecord, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Call database function to create log (handles duplicate check)
    const { data, error } = await platformDb.rpc('create_lessons_log_for_project', {
      p_project_id: projectId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created log
    const { data: log, error: fetchError } = await platformDb
      .from('lessons_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) throw fetchError;

    return { success: true, data: log };
  } catch (error) {
    console.error('Error creating lessons log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get lessons log by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Lessons log data
 */
export async function getLessonsLogByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_logs')
      .select(`
        *,
        projects:project_id(id, project_name, project_code),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      // Log doesn't exist yet - return null
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching lessons log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update lessons log
 * @param {string} logId - Lessons log ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated log
 */
export async function updateLessonsLog(logId, updates) {
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
      .from('lessons_logs')
      .update({
        ...updates,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating lessons log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add revision history entry
 * @param {string} logId - Lessons log ID
 * @param {Object} revisionData - Revision data
 * @returns {Promise<Object>} Created revision entry
 */
export async function addRevisionHistory(logId, revisionData) {
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
      .from('lessons_log_revision_history')
      .insert({
        lessons_log_id: logId,
        ...revisionData,
        revised_by: userRecord.id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding revision history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get revision history for a log
 * @param {string} logId - Lessons log ID
 * @returns {Promise<Array>} Revision history entries
 */
export async function getRevisionHistory(logId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_log_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('lessons_log_id', logId)
      .order('revision_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching revision history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add approval record
 * @param {string} logId - Lessons log ID
 * @param {Object} approvalData - Approval data
 * @returns {Promise<Object>} Created approval
 */
export async function addApproval(logId, approvalData) {
  try {
    const { data, error } = await platformDb
      .from('lessons_log_approvals')
      .insert({
        lessons_log_id: logId,
        ...approvalData
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding approval:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get approvals for a log
 * @param {string} logId - Lessons log ID
 * @returns {Promise<Array>} Approval records
 */
export async function getApprovals(logId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_log_approvals')
      .select('*')
      .eq('lessons_log_id', logId)
      .order('approval_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add distribution record
 * @param {string} logId - Lessons log ID
 * @param {Object} distributionData - Distribution data
 * @returns {Promise<Object>} Created distribution record
 */
export async function addDistribution(logId, distributionData) {
  try {
    const { data, error } = await platformDb
      .from('lessons_log_distribution')
      .insert({
        lessons_log_id: logId,
        ...distributionData
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding distribution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get distribution records for a log
 * @param {string} logId - Lessons log ID
 * @returns {Promise<Array>} Distribution records
 */
export async function getDistributions(logId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_log_distribution')
      .select('*')
      .eq('lessons_log_id', logId)
      .order('date_of_issue', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return { success: false, error: error.message };
  }
}
