/**
 * Practice Task Service
 * 
 * CRUD operations for practice tasks in simulator (sim schema)
 * Uses simDb client
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  
  const { data: userData, error } = await simDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

/**
 * Get practice tasks for a project
 * @param {string} projectId - Practice project ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Tasks data
 */
export async function getPracticeTasks(projectId, filters = {}) {
  try {
    let query = simDb
      .from('practice_tasks')
      .select('*')
      .eq('practice_project_id', projectId)
      .eq('is_deleted', false)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.assigned_to_user_id) {
      query = query.eq('assigned_to_user_id', filters.assigned_to_user_id)
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting practice tasks:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get practice task by ID
 * @param {string} taskId - Practice task ID
 * @returns {Promise<Object>} Task data
 */
export async function getPracticeTaskById(taskId) {
  try {
    const { data, error } = await simDb
      .from('practice_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error getting practice task:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create practice task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createPracticeTask(taskData) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_tasks')
      .insert({
        ...taskData,
        user_id: userId,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating practice task:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update practice task
 * @param {string} taskId - Practice task ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated task
 */
export async function updatePracticeTask(taskId, updates) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_tasks')
      .update({
        ...updates,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating practice task:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete practice task (soft delete)
 * @param {string} taskId - Practice task ID
 * @returns {Promise<Object>} Result
 */
export async function deletePracticeTask(taskId) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_tasks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_by: userId
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error deleting practice task:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Assign task to user
 * @param {string} taskId - Practice task ID
 * @param {string} userId - User ID to assign to
 * @returns {Promise<Object>} Result
 */
export async function assignPracticeTask(taskId, userId) {
  try {
    const currentUserId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_task_assignments')
      .upsert({
        practice_task_id: taskId,
        user_id: userId,
        assignment_type: 'assignee',
        assigned_by_user_id: currentUserId,
        is_active: true
      }, {
        onConflict: 'practice_task_id,user_id,assignment_type'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error assigning practice task:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getPracticeTasks,
  getPracticeTaskById,
  createPracticeTask,
  updatePracticeTask,
  deletePracticeTask,
  assignPracticeTask
}
