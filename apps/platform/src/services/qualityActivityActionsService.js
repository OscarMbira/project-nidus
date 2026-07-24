/**
 * Quality Activity Actions Service
 * Manages action items (corrective, preventive, improvement) from quality activities
 */

import { supabase } from './supabaseClient';

/**
 * Get actions for a quality activity
 * @param {string} activityType - 'review', 'inspection', 'audit', 'test'
 * @param {string} activityId - Activity ID
 * @param {Object} filters - Optional filters (status, priority, assigned_to_id)
 * @returns {Promise<Object>} Actions array
 */
export async function getActions(activityType, activityId, filters = {}) {
  try {
    let query = supabase
      .from('quality_activity_actions')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        verified_by_user:verified_by_id(id, full_name, email)
      `)
      .eq('activity_type', activityType)
      .eq('activity_id', activityId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.assigned_to_id) {
      query = query.eq('assigned_to_id', filters.assigned_to_id);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting quality activity actions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add an action to a quality activity
 * @param {string} activityType - 'review', 'inspection', 'audit', 'test'
 * @param {string} activityId - Activity ID
 * @param {Object} actionData - Action data
 * @returns {Promise<Object>} Created action
 */
export async function addAction(activityType, activityId, actionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const insertData = {
      activity_type: activityType,
      activity_id: activityId,
      action_reference: actionData.action_reference || null,
      action_description: actionData.action_description,
      action_type: actionData.action_type || 'corrective',
      priority: actionData.priority || 'medium',
      assigned_to_id: actionData.assigned_to_id || null,
      due_date: actionData.due_date || null,
      status: 'open',
      created_by: userRecord.id,
      updated_by: userRecord.id
    };

    const { data, error } = await supabase
      .from('quality_activity_actions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding quality activity action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a quality activity action
 * @param {string} actionId - Action ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated action
 */
export async function updateAction(actionId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const updateData = {
      ...updates,
      updated_by: userRecord.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quality_activity_actions')
      .update(updateData)
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating quality activity action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete a quality activity action
 * @param {string} actionId - Action ID
 * @param {string} completionNotes - Notes about completion
 * @returns {Promise<Object>} Updated action
 */
export async function completeAction(actionId, completionNotes = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const { data, error } = await supabase
      .from('quality_activity_actions')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        completion_notes: completionNotes,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error completing quality activity action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify a quality activity action
 * @param {string} actionId - Action ID
 * @param {string} verificationNotes - Notes about verification
 * @returns {Promise<Object>} Updated action
 */
export async function verifyAction(actionId, verificationNotes = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const { data, error } = await supabase
      .from('quality_activity_actions')
      .update({
        status: 'verified',
        verified_by_id: userRecord.id,
        verification_date: new Date().toISOString().split('T')[0],
        verification_notes: verificationNotes,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error verifying quality activity action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get overdue actions for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Overdue actions
 */
export async function getOverdueActions(projectId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get actions from reviews
    const { data: reviewActions } = await supabase
      .from('quality_activity_actions')
      .select(`
        *,
        activity:activity_id(id, activity_identifier, review_title, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('activity_type', 'review')
      .in('activity_id', 
        supabase
          .from('quality_reviews')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
      )
      .eq('is_deleted', false)
      .in('status', ['open', 'in_progress'])
      .lt('due_date', today);

    // Get actions from inspections
    const { data: inspectionActions } = await supabase
      .from('quality_activity_actions')
      .select(`
        *,
        activity:activity_id(id, activity_identifier, inspection_title, project_id),
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('activity_type', 'inspection')
      .in('activity_id',
        supabase
          .from('quality_inspections')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
      )
      .eq('is_deleted', false)
      .in('status', ['open', 'in_progress'])
      .lt('due_date', today);

    const allActions = [...(reviewActions || []), ...(inspectionActions || [])];

    return { success: true, data: allActions };
  } catch (error) {
    console.error('Error getting overdue actions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get actions assigned to current user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's actions
 */
export async function getMyActions(userId) {
  try {
    const { data, error } = await supabase
      .from('quality_activity_actions')
      .select(`
        *,
        assigned_to_user:assigned_to_id(id, full_name, email)
      `)
      .eq('assigned_to_id', userId)
      .eq('is_deleted', false)
      .in('status', ['open', 'in_progress'])
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting my actions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a quality activity action (soft delete)
 * @param {string} actionId - Action ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAction(actionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      throw new Error('User record not found');
    }

    const { error } = await supabase
      .from('quality_activity_actions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting quality activity action:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getActions,
  addAction,
  updateAction,
  completeAction,
  verifyAction,
  deleteAction,
  getOverdueActions,
  getMyActions
};
