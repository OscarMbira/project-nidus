import { supabase } from './supabaseClient';

/**
 * Issue Action Service - API functions for Issue Actions
 * Handles resolution actions for issues
 */

/**
 * Add an action to an issue
 * @param {string} issueId - Issue ID
 * @param {Object} actionData - Action data
 * @returns {Promise<Object>} Created action
 */
export async function addAction(issueId, actionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next action number
    const { data: existingActions } = await supabase
      .from('issue_actions')
      .select('action_number')
      .eq('issue_id', issueId)
      .order('action_number', { ascending: false })
      .limit(1);

    const nextActionNumber = existingActions && existingActions.length > 0
      ? existingActions[0].action_number + 1
      : 1;

    const insertData = {
      ...actionData,
      issue_id: issueId,
      action_number: nextActionNumber,
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('issue_actions')
      .insert(insertData)
      .select(`
        *,
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding action:', error);
    throw error;
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
    const { data, error } = await supabase
      .from('issue_actions')
      .update(updates)
      .eq('id', actionId)
      .select(`
        *,
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating action:', error);
    throw error;
  }
}

/**
 * Delete an action
 * @param {string} actionId - Action ID
 * @returns {Promise<void>}
 */
export async function deleteAction(actionId) {
  try {
    const { error } = await supabase
      .from('issue_actions')
      .delete()
      .eq('id', actionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting action:', error);
    throw error;
  }
}

/**
 * Get all actions for an issue
 * @param {string} issueId - Issue ID
 * @returns {Promise<Array>} Array of actions
 */
export async function getActions(issueId) {
  try {
    const { data, error } = await supabase
      .from('issue_actions')
      .select(`
        *,
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .eq('issue_id', issueId)
      .order('action_number', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching actions:', error);
    throw error;
  }
}

/**
 * Start an action
 * @param {string} actionId - Action ID
 * @returns {Promise<Object>} Updated action
 */
export async function startAction(actionId) {
  return await updateAction(actionId, { status: 'in_progress' });
}

/**
 * Complete an action
 * @param {string} actionId - Action ID
 * @param {string} notes - Completion notes
 * @returns {Promise<Object>} Updated action
 */
export async function completeAction(actionId, notes = null) {
  return await updateAction(actionId, {
    status: 'completed',
    completion_date: new Date().toISOString().split('T')[0],
    completion_notes: notes
  });
}

/**
 * Cancel an action
 * @param {string} actionId - Action ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated action
 */
export async function cancelAction(actionId, reason) {
  return await updateAction(actionId, {
    status: 'cancelled',
    completion_notes: reason
  });
}

/**
 * Block an action
 * @param {string} actionId - Action ID
 * @param {string} blockingReason - Blocking reason
 * @returns {Promise<Object>} Updated action
 */
export async function blockAction(actionId, blockingReason) {
  return await updateAction(actionId, {
    status: 'blocked',
    completion_notes: blockingReason
  });
}

/**
 * Get overdue actions for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of overdue actions
 */
export async function getOverdueActions(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_overdue_issue_actions', {
      p_project_id: projectId
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching overdue actions:', error);
    throw error;
  }
}

/**
 * Get actions assigned to a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of actions
 */
export async function getMyActions(userId) {
  try {
    const { data, error } = await supabase
      .from('issue_actions')
      .select(`
        *,
        issue:issues!inner(
          id,
          issue_identifier,
          issue_title,
          status,
          priority,
          severity,
          project:projects(id, project_name)
        ),
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .eq('assigned_to_id', userId)
      .in('status', ['planned', 'in_progress', 'blocked'])
      .order('target_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching my actions:', error);
    throw error;
  }
}

/**
 * Get actions by status for a project
 * @param {string} projectId - Project ID
 * @param {string} status - Action status
 * @returns {Promise<Array>} Array of actions
 */
export async function getActionsByStatus(projectId, status) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) return [];

    const { data: issues } = await supabase
      .from('issues')
      .select('id')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (!issues || issues.length === 0) return [];

    const issueIds = issues.map(i => i.id);

    const { data, error } = await supabase
      .from('issue_actions')
      .select(`
        *,
        issue:issues(id, issue_identifier, issue_title),
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .in('issue_id', issueIds)
      .eq('status', status)
      .order('target_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching actions by status:', error);
    throw error;
  }
}

export default {
  addAction,
  updateAction,
  deleteAction,
  getActions,
  startAction,
  completeAction,
  cancelAction,
  blockAction,
  getOverdueActions,
  getMyActions,
  getActionsByStatus
};
