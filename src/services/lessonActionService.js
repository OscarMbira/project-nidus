/**
 * Lesson Action Service
 * Provides action management functionality for lessons
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get actions for a lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Actions data
 */
export async function getActionsByLesson(lessonId) {
  try {
    const { data, error } = await platformDb
      .from('lesson_actions')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('lesson_id', lessonId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lesson actions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create an action for a lesson
 * @param {Object} actionData - Action data
 * @returns {Promise<Object>} Created action
 */
export async function createAction(actionData) {
  try {
    const { data, error } = await platformDb
      .from('lesson_actions')
      .insert(actionData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an action
 * @param {string} actionId - Action ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated action
 */
export async function updateAction(actionId, updates) {
  try {
    const { data, error } = await platformDb
      .from('lesson_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an action (soft delete)
 * @param {string} actionId - Action ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAction(actionId) {
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

    const { error } = await platformDb
      .from('lesson_actions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', actionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get actions assigned to a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Actions data
 */
export async function getActionsByUser(userId, filters = {}) {
  try {
    let query = platformDb
      .from('lesson_actions')
      .select(`
        *,
        lesson:lesson_id(id, lesson_title, lesson_reference, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('assigned_to_id', userId)
      .eq('is_deleted', false);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('target_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching user actions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get overdue actions
 * @param {string} projectId - Optional project ID filter
 * @returns {Promise<Object>} Overdue actions
 */
export async function getOverdueActions(projectId = null) {
  try {
    let query = platformDb
      .from('lesson_actions')
      .select(`
        *,
        lesson:lesson_id(id, lesson_title, lesson_reference, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('is_deleted', false)
      .eq('status', 'pending')
      .lt('target_date', new Date().toISOString().split('T')[0]);

    if (projectId) {
      query = query.eq('lesson.project_id', projectId);
    }

    query = query.order('target_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching overdue actions:', error);
    return { success: false, error: error.message };
  }
}
