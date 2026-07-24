/**
 * Practice Project Service
 * 
 * CRUD operations for practice projects in simulator (sim schema)
 * Uses simDb client
 */

import { simDb } from '../supabase/supabaseClient'

/**
 * Get current user's internal ID from auth user ID
 */
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
 * Get user's practice projects
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Object>} Practice projects data
 */
export async function getMyPracticeProjects(userId, filters = {}, options = {}) {
  try {
    let query = simDb
      .from('practice_projects')
      .select(`
        *,
        project_type:project_type_id(id, type_name, type_code),
        project_status:status_id(id, status_name, status_color)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)

    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id)
    }

    if (filters.search) {
      query = query.or(`project_name.ilike.%${filters.search}%,project_description.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })

    if (options.signal) {
      query = query.abortSignal(options.signal)
    }

    const { data: projects, error } = await query

    if (error) throw error

    return { success: true, data: projects || [] }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { success: false, aborted: true, error: error.message }
    }
    console.error('Error getting practice projects:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get practice project by ID
 * @param {string} projectId - Practice project ID
 * @returns {Promise<Object>} Practice project data
 */
export async function getPracticeProjectById(projectId) {
  try {
    const { data, error } = await simDb
      .from('practice_projects')
      .select(`
        *,
        project_type:project_type_id(id, type_name, type_code),
        project_status:status_id(id, status_name, status_color)
      `)
      .eq('id', projectId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error getting practice project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new practice project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createPracticeProject(projectData) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_projects')
      .insert({
        ...projectData,
        user_id: userId,
        is_practice_mode: true,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating practice project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update practice project
 * @param {string} projectId - Practice project ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated project
 */
export async function updatePracticeProject(projectId, updates) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_projects')
      .update({
        ...updates,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating practice project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete practice project (soft delete)
 * @param {string} projectId - Practice project ID
 * @returns {Promise<Object>} Result
 */
export async function deletePracticeProject(projectId) {
  try {
    const userId = await getCurrentUserId()
    
    const { data, error } = await simDb
      .from('practice_projects')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_by: userId
      })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error deleting practice project:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update practice project stage
 * @param {string} projectId - Practice project ID
 * @param {string} stageId - Stage ID
 * @returns {Promise<Object>} Result
 */
export async function updatePracticeProjectStage(projectId, stageId) {
  try {
    const userId = await getCurrentUserId()
    
    // Set all stages to not current
    await simDb
      .from('practice_project_stages')
      .update({ is_current: false })
      .eq('practice_project_id', projectId)
    
    // Set selected stage as current
    const { data, error } = await simDb
      .from('practice_project_stages')
      .update({ is_current: true })
      .eq('id', stageId)
      .eq('practice_project_id', projectId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating practice project stage:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getMyPracticeProjects,
  getPracticeProjectById,
  createPracticeProject,
  updatePracticeProject,
  deletePracticeProject,
  updatePracticeProjectStage
}
