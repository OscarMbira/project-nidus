/**
 * Lesson Service
 * Provides lesson management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get lessons for a project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Lessons data
 */
export async function getLessonsByProject(projectId, filters = {}) {
  try {
    let query = platformDb
      .from('lessons_learned')
      .select(`
        *,
        lessons_log:lessons_log_id(id, log_reference),
        project:project_id(id, project_name, project_code),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email),
        actioned_by_user:actioned_by_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.effect_type) {
      query = query.eq('effect_type', filters.effect_type);
    }
    if (filters.lesson_category) {
      query = query.eq('lesson_category', filters.lesson_category);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.is_corporate_lesson !== undefined) {
      query = query.eq('is_corporate_lesson', filters.is_corporate_lesson);
    }
    if (filters.search) {
      query = query.or(`lesson_title.ilike.%${filters.search}%,what_happened.ilike.%${filters.search}%,recommendations.ilike.%${filters.search}%`);
    }

    // Ordering
    const orderBy = filters.orderBy || 'lesson_date';
    const ascending = filters.ascending !== undefined ? filters.ascending : false;
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get lesson by ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Lesson data
 */
export async function getLessonById(lessonId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_learned')
      .select(`
        *,
        lessons_log:lessons_log_id(id, log_reference),
        project:project_id(id, project_name, project_code),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email),
        actioned_by_user:actioned_by_id(id, full_name, email)
      `)
      .eq('id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a lesson
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export async function createLesson(lessonData) {
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

    // Ensure lessons_log_id exists
    if (!lessonData.lessons_log_id && lessonData.project_id) {
      const logResult = await platformDb.rpc('create_lessons_log_for_project', {
        p_project_id: lessonData.project_id,
        p_user_id: userRecord.id
      });
      if (logResult.error) throw logResult.error;
      
      const { data: log } = await platformDb
        .from('lessons_logs')
        .select('id')
        .eq('project_id', lessonData.project_id)
        .eq('is_deleted', false)
        .single();
      
      lessonData.lessons_log_id = log.id;
    }

    const { data, error } = await platformDb
      .from('lessons_learned')
      .insert({
        ...lessonData,
        created_by: userRecord.id,
        lesson_date: lessonData.lesson_date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating lesson:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a lesson
 * @param {string} lessonId - Lesson ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lesson
 */
export async function updateLesson(lessonId, updates) {
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
      .from('lessons_learned')
      .update({
        ...updates,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating lesson:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a lesson (soft delete)
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteLesson(lessonId) {
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
      .from('lessons_learned')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', lessonId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get lessons summary for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Summary statistics
 */
export async function getLessonsSummary(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_lessons_summary', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error fetching lessons summary:', error);
    return { success: false, error: error.message };
  }
}
