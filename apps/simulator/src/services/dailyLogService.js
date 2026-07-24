/**
 * Daily Log Service
 * Provides daily log management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a daily log for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created daily log
 */
export async function createDailyLog(projectId) {
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
    const { data, error } = await platformDb.rpc('create_daily_log_for_project', {
      p_project_id: projectId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created log
    const { data: log, error: fetchError } = await platformDb
      .from('daily_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) throw fetchError;

    return { success: true, data: log };
  } catch (error) {
    console.error('Error creating daily log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily log by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Daily log data
 */
export async function getDailyLogByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('daily_logs')
      .select(`
        *,
        projects:project_id(id, project_name, project_code),
        programmes:programme_id(id, programme_name)
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
    console.error('Error getting daily log by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily log by ID
 * @param {string} logId - Daily log ID
 * @returns {Promise<Object>} Daily log data
 */
export async function getDailyLogById(logId) {
  try {
    const { data, error } = await platformDb
      .from('daily_logs')
      .select(`
        *,
        projects:project_id(id, project_name, project_code),
        programmes:programme_id(id, programme_name),
        created_by_user:created_by(id, full_name, email)
      `)
      .eq('id', logId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting daily log by ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update daily log visibility
 * @param {string} logId - Daily log ID
 * @param {string} visibility - Visibility level ('private', 'team', 'stakeholders', 'public')
 * @returns {Promise<Object>} Updated daily log
 */
export async function updateDailyLogVisibility(logId, visibility) {
  try {
    const { data, error } = await platformDb
      .from('daily_logs')
      .update({ visibility })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating daily log visibility:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive daily log
 * @param {string} logId - Daily log ID
 * @returns {Promise<Object>} Result
 */
export async function archiveDailyLog(logId) {
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

    const { error } = await platformDb
      .from('daily_logs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error archiving daily log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily log summary statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Summary statistics
 */
export async function getSummary(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_daily_log_summary', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error getting daily log summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily log statistics
 * @param {string} logId - Daily log ID
 * @returns {Promise<Object>} Statistics
 */
export async function getStats(logId) {
  try {
    // Get log to find project_id
    const { data: log, error: logError } = await platformDb
      .from('daily_logs')
      .select('project_id')
      .eq('id', logId)
      .eq('is_deleted', false)
      .single();

    if (logError) throw logError;

    return await getSummary(log.project_id);
  } catch (error) {
    console.error('Error getting daily log stats:', error);
    return { success: false, error: error.message };
  }
}
