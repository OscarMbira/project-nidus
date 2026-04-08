/**
 * Lessons Report Recommendation Service
 * Manages recommendations in Lessons Reports
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add recommendation to report
 * @param {string} reportId - Report ID
 * @param {Object} recommendationData - Recommendation data
 * @returns {Promise<Object>} Created recommendation
 */
export async function addRecommendation(reportId, recommendationData) {
  try {
    // Get current max display_order
    const { data: existing } = await platformDb
      .from('lessons_report_recommendations')
      .select('display_order')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existing?.[0]?.display_order || -1;

    const recommendation = {
      lessons_report_id: reportId,
      recommendation_title: recommendationData.recommendation_title || '',
      recommendation_description: recommendationData.recommendation_description || '',
      recommendation_type: recommendationData.recommendation_type || 'other',
      priority: recommendationData.priority || 'medium',
      responsible_party_id: recommendationData.responsible_party_id || null,
      responsible_party_name: recommendationData.responsible_party_name || null,
      target_implementation_date: recommendationData.target_implementation_date || null,
      implementation_status: recommendationData.implementation_status || 'pending',
      implementation_notes: recommendationData.implementation_notes || null,
      related_lesson_ids: recommendationData.related_lesson_ids || [],
      display_order: recommendationData.display_order || maxOrder + 1
    };

    const { data, error } = await platformDb
      .from('lessons_report_recommendations')
      .insert(recommendation)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding recommendation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update recommendation
 * @param {string} recommendationId - Recommendation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated recommendation
 */
export async function updateRecommendation(recommendationId, updates) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_recommendations')
      .update(updates)
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete recommendation
 * @param {string} recommendationId - Recommendation ID
 * @returns {Promise<Object>} Result
 */
export async function deleteRecommendation(recommendationId) {
  try {
    const { error } = await platformDb
      .from('lessons_report_recommendations')
      .delete()
      .eq('id', recommendationId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recommendations for report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Recommendations list
 */
export async function getRecommendations(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_recommendations')
      .select(`
        *,
        responsible_party:responsible_party_id(id, full_name, email)
      `)
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync recommendations from lessons
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Sync result
 */
export async function syncRecommendationsFromLessons(reportId) {
  try {
    // Get lessons in report
    const { data: reportLessons, error: lessonsError } = await platformDb
      .from('lessons_report_lessons')
      .select(`
        lesson_id,
        lesson:lesson_id(
          id,
          lesson_title,
          recommendations,
          priority,
          effect_type
        )
      `)
      .eq('lessons_report_id', reportId);

    if (lessonsError) throw lessonsError;

    // Get existing recommendations
    const { data: existingRecs } = await platformDb
      .from('lessons_report_recommendations')
      .select('id, recommendation_title')
      .eq('lessons_report_id', reportId);

    const existingTitles = new Set(existingRecs?.map(r => r.recommendation_title.toLowerCase()) || []);

    // Get current max display_order
    const { data: maxOrderData } = await platformDb
      .from('lessons_report_recommendations')
      .select('display_order')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1);

    let currentOrder = maxOrderData?.[0]?.display_order || -1;

    // Extract recommendations from lessons
    const addedRecommendations = [];
    const lessonsByRecommendation = {};

    for (const reportLesson of reportLessons || []) {
      const lesson = reportLesson.lesson;
      if (!lesson?.recommendations) continue;

      // Split recommendations (they might be in one text field)
      const recs = lesson.recommendations.split(/\n+|•|[-*]/).filter(r => r.trim().length > 0);

      for (const recText of recs) {
        const trimmedRec = recText.trim();
        if (trimmedRec.length < 10 || existingTitles.has(trimmedRec.toLowerCase())) continue;

        currentOrder++;
        existingTitles.add(trimmedRec.toLowerCase());

        const { data: added, error: addError } = await platformDb
          .from('lessons_report_recommendations')
          .insert({
            lessons_report_id: reportId,
            recommendation_title: trimmedRec.substring(0, 500),
            recommendation_description: trimmedRec,
            recommendation_type: 'other',
            priority: lesson.priority || 'medium',
            related_lesson_ids: [lesson.id],
            display_order: currentOrder,
            implementation_status: 'pending'
          })
          .select()
          .single();

        if (!addError) {
          addedRecommendations.push(added);
          lessonsByRecommendation[added.id] = lesson.id;
        }
      }
    }

    return {
      success: true,
      data: {
        added: addedRecommendations.length,
        recommendations: addedRecommendations
      }
    };
  } catch (error) {
    console.error('Error syncing recommendations from lessons:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update implementation status
 * @param {string} recommendationId - Recommendation ID
 * @param {string} status - New status
 * @param {string} notes - Implementation notes
 * @returns {Promise<Object>} Updated recommendation
 */
export async function updateImplementationStatus(recommendationId, status, notes = null) {
  try {
    const updates = {
      implementation_status: status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updates.implementation_notes = notes;
    }

    if (status === 'completed') {
      updates.effectiveness_assessment = notes || null;
    }

    const { data, error } = await platformDb
      .from('lessons_report_recommendations')
      .update(updates)
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating implementation status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recommendations by responsible party
 * @param {string} responsiblePartyId - User ID
 * @returns {Promise<Object>} Recommendations list
 */
export async function getRecommendationsByResponsible(responsiblePartyId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_recommendations')
      .select(`
        *,
        report:lessons_report_id(id, report_reference, project:project_id(id, project_name))
      `)
      .eq('responsible_party_id', responsiblePartyId)
      .order('target_implementation_date', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching recommendations by responsible:', error);
    return { success: false, error: error.message };
  }
}

export default {
  addRecommendation,
  updateRecommendation,
  deleteRecommendation,
  getRecommendations,
  syncRecommendationsFromLessons,
  updateImplementationStatus,
  getRecommendationsByResponsible
};
