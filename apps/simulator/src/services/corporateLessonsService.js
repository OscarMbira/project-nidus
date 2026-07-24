/**
 * Corporate Lessons Service
 * Provides corporate lessons repository functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Promote a lesson to corporate repository
 * @param {string} lessonId - Lesson ID
 * @param {Object} promotionData - Promotion data
 * @returns {Promise<Object>} Promotion result
 */
export async function promoteToCorporate(lessonId, promotionData = {}) {
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

    // Get project account
    const { data: lesson } = await platformDb
      .from('lessons_learned')
      .select(`
        project_id,
        project:project_id(account_id)
      `)
      .eq('id', lessonId)
      .single();

    if (!lesson || !lesson.project?.account_id) {
      return { success: false, error: 'Project account not found' };
    }

    const { data, error } = await platformDb.rpc('promote_to_corporate', {
      p_lesson_id: lessonId,
      p_user_id: userRecord.id,
      p_organisation_id: lesson.project.account_id,
      p_applicability_notes: promotionData.applicability_notes || null,
      p_project_type_tags: promotionData.project_type_tags || null,
      p_industry_tags: promotionData.industry_tags || null
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error promoting lesson to corporate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get relevant corporate lessons for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Relevant corporate lessons
 */
export async function getRelevantCorporateLessons(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_relevant_corporate_lessons', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching relevant corporate lessons:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get corporate lessons by category
 * @param {string} organisationId - Organisation ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Corporate lessons
 */
export async function getCorporateLessonsByCategory(organisationId, filters = {}) {
  try {
    let query = platformDb
      .from('corporate_lessons_repository')
      .select(`
        *,
        lesson:lesson_id(
          *,
          project:project_id(id, project_name, project_code)
        )
      `)
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    if (filters.project_type_tags) {
      query = query.contains('project_type_tags', filters.project_type_tags);
    }
    if (filters.industry_tags) {
      query = query.contains('industry_tags', filters.industry_tags);
    }

    query = query.order('usefulness_rating', { ascending: false, nullsLast: true })
      .order('view_count', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching corporate lessons:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search corporate lessons
 * @param {string} organisationId - Organisation ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Object>} Search results
 */
export async function searchCorporateLessons(organisationId, searchTerm) {
  try {
    const { data, error } = await platformDb
      .from('corporate_lessons_repository')
      .select(`
        *,
        lesson:lesson_id(
          *,
          project:project_id(id, project_name, project_code)
        )
      `)
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .or(`lesson.lesson_title.ilike.%${searchTerm}%,lesson.recommendations.ilike.%${searchTerm}%,lesson.what_happened.ilike.%${searchTerm}%`)
      .order('usefulness_rating', { ascending: false, nullsLast: true })
      .limit(50);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching corporate lessons:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Increment view count for a corporate lesson
 * @param {string} corporateLessonId - Corporate lesson repository ID
 * @returns {Promise<Object>} Update result
 */
export async function incrementViewCount(corporateLessonId) {
  try {
    const { data, error } = await platformDb.rpc('increment_corporate_lesson_view', {
      p_corporate_lesson_id: corporateLessonId
    });

    if (error) {
      // If function doesn't exist, do manual update
      const { data: current } = await platformDb
        .from('corporate_lessons_repository')
        .select('view_count')
        .eq('id', corporateLessonId)
        .single();

      const { error: updateError } = await platformDb
        .from('corporate_lessons_repository')
        .update({ view_count: (current?.view_count || 0) + 1 })
        .eq('id', corporateLessonId);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rate a corporate lesson
 * @param {string} lessonId - Lesson ID
 * @param {number} rating - Rating (1-5)
 * @param {boolean} wasHelpful - Whether lesson was helpful
 * @param {string} feedback - Optional feedback
 * @returns {Promise<Object>} Rating result
 */
export async function rateCorporateLesson(lessonId, rating, wasHelpful = true, feedback = null) {
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
      .from('lesson_ratings')
      .upsert({
        lesson_id: lessonId,
        rated_by: userRecord.id,
        rating,
        was_helpful: wasHelpful,
        feedback
      }, {
        onConflict: 'lesson_id,rated_by'
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error rating lesson:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get lesson ratings
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Ratings data
 */
export async function getLessonRatings(lessonId) {
  try {
    const { data, error } = await platformDb
      .from('lesson_ratings')
      .select(`
        *,
        rated_by_user:rated_by(id, full_name, email)
      `)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lesson ratings:', error);
    return { success: false, error: error.message };
  }
}
