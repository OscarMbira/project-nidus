/**
 * Task Service
 * Provides task management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get user's tasks (tasks assigned to user)
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Tasks data
 */
export async function getMyTasks(userId, filters = {}) {
  try {
    let query = platformDb
      .from('tasks')
      .select(`
        id,
        task_name,
        task_description,
        status_id,
        task_statuses(status_name, status_color),
        priority,
        project_id,
        projects(
          id,
          project_name,
          project_code,
          account_id
        ),
        assigned_to_user_id,
        due_date,
        estimated_hours,
        actual_hours,
        percentage_complete,
        created_at
      `)
      .eq('assigned_to_user_id', userId)
      .eq('is_deleted', false);

    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id);
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`);
    }

    const { data: tasks, error } = await query
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false });

    if (error) throw error;

    return { success: true, data: tasks || [] };
  } catch (error) {
    console.error('Error getting my tasks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all tasks for an organization
 * @param {string} organizationId - Account ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Tasks data
 */
export async function getAllTasks(organizationId, filters = {}) {
  try {
    // Get projects for this account
    const { data: projects } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    const projectIds = projects?.map(p => p.id) || [];

    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    let query = platformDb
      .from('tasks')
      .select(`
        id,
        task_name,
        task_description,
        status_id,
        task_statuses(status_name, status_color),
        priority,
        project_id,
        projects(
          id,
          project_name,
          project_code
        ),
        assigned_to_user_id,
        assigned_user:assigned_to_user_id(id, full_name, email),
        due_date,
        estimated_hours,
        actual_hours,
        percentage_complete,
        created_at
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false);

    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id);
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`);
    }

    const { data: tasks, error } = await query
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false });

    if (error) throw error;

    return { success: true, data: tasks || [] };
  } catch (error) {
    console.error('Error getting all tasks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get tasks by project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Tasks data
 */
export async function getTasksByProject(projectId, filters = {}) {
  try {
    let query = platformDb
      .from('tasks')
      .select(`
        id,
        task_name,
        task_description,
        status_id,
        task_statuses(status_name, status_color),
        priority,
        assigned_to_user_id,
        assigned_user:assigned_to_user_id(id, full_name, email),
        due_date,
        estimated_hours,
        actual_hours,
        percentage_complete,
        created_at
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`);
    }

    const { data: tasks, error } = await query
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false });

    if (error) throw error;

    return { success: true, data: tasks || [] };
  } catch (error) {
    console.error('Error getting tasks by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get task detail
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task detail
 */
export async function getTaskDetail(taskId) {
  try {
    const { data: task, error } = await platformDb
      .from('tasks')
      .select(`
        *,
        task_statuses(status_name, status_color),
        projects(id, project_name, project_code),
        assigned_user:assigned_to_user_id(id, full_name, email)
      `)
      .eq('id', taskId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data: task };
  } catch (error) {
    console.error('Error getting task detail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  try {
    const { data, error } = await platformDb
      .from('tasks')
      .insert({
        task_name: taskData.task_name,
        task_description: taskData.task_description,
        project_id: taskData.project_id,
        status_id: taskData.status_id,
        priority: taskData.priority || 'medium',
        assigned_to_user_id: taskData.assigned_to_user_id,
        due_date: taskData.due_date,
        estimated_hours: taskData.estimated_hours,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update task
 * @param {string} taskId - Task ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, taskData) {
  try {
    const { data, error } = await platformDb
      .from('tasks')
      .update({
        ...taskData,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete task (soft delete)
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Result
 */
export async function deleteTask(taskId) {
  try {
    const { error } = await platformDb
      .from('tasks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign task to user
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export async function assignTask(taskId, userId) {
  try {
    const { data, error } = await platformDb
      .from('tasks')
      .update({
        assigned_to_user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error assigning task:', error);
    return { success: false, error: error.message };
  }
}

