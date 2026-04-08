/**
 * Lessons Report Lesson Service
 * Manages lessons included in Lessons Reports
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add lesson to report
 * @param {string} reportId - Report ID
 * @param {string} lessonId - Lesson ID
 * @param {Object} inclusionData - Inclusion data
 * @returns {Promise<Object>} Result
 */
export async function addLessonToReport(reportId, lessonId, inclusionData = {}) {
  try {
    // Get current max display_order for this report
    const { data: existingLessons } = await platformDb
      .from('lessons_report_lessons')
      .select('display_order')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existingLessons?.[0]?.display_order || -1;

    const lessonData = {
      lessons_report_id: reportId,
      lesson_id: lessonId,
      inclusion_reason: inclusionData.inclusion_reason || null,
      significance_level: inclusionData.significance_level || 'medium',
      section_in_report: inclusionData.section_in_report || 'Significant Lessons',
      display_order: inclusionData.display_order || maxOrder + 1
    };

    const { data, error } = await platformDb
      .from('lessons_report_lessons')
      .insert(lessonData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding lesson to report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove lesson from report
 * @param {string} reportLessonId - Report lesson ID
 * @returns {Promise<Object>} Result
 */
export async function removeLessonFromReport(reportLessonId) {
  try {
    const { error } = await platformDb
      .from('lessons_report_lessons')
      .delete()
      .eq('id', reportLessonId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing lesson from report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get lessons in report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Lessons list
 */
export async function getLessonsInReport(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_lessons')
      .select(`
        *,
        lesson:lesson_id(
          id,
          lesson_reference,
          lesson_title,
          lesson_scope,
          lesson_category,
          effect_type,
          priority,
          what_happened,
          impact_description,
          cause_description,
          recommendations,
          lesson_date,
          status
        )
      `)
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching lessons in report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update lesson inclusion
 * @param {string} reportLessonId - Report lesson ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated lesson
 */
export async function updateLessonInclusion(reportLessonId, updates) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_lessons')
      .update(updates)
      .eq('id', reportLessonId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating lesson inclusion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync lessons from log
 * @param {string} reportId - Report ID
 * @param {Object} filters - Filters (date range, effect type, priority, etc.)
 * @returns {Promise<Object>} Sync result
 */
export async function syncLessonsFromLog(reportId, filters = {}) {
  try {
    // Get report to get lessons_log_id and reporting period
    const { data: report, error: reportError } = await platformDb
      .from('lessons_reports')
      .select('lessons_log_id, reporting_period_start, reporting_period_end')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: 'Report not found' };
    }

    // Build query for lessons
    let query = platformDb
      .from('lessons_learned')
      .select('id, lesson_reference, lesson_title, effect_type, priority, lesson_date')
      .eq('lessons_log_id', report.lessons_log_id)
      .eq('is_deleted', false);

    // Apply date range filter
    if (report.reporting_period_start || report.reporting_period_end) {
      if (report.reporting_period_start) {
        query = query.gte('lesson_date', report.reporting_period_start);
      }
      if (report.reporting_period_end) {
        query = query.lte('lesson_date', report.reporting_period_end);
      }
    }

    // Apply filters
    if (filters.effect_type) {
      query = query.eq('effect_type', filters.effect_type);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.category) {
      query = query.eq('lesson_category', filters.category);
    }

    const { data: lessons, error: lessonsError } = await query;

    if (lessonsError) throw lessonsError;

    // Get existing lessons in report to avoid duplicates
    const { data: existingLessons } = await platformDb
      .from('lessons_report_lessons')
      .select('lesson_id')
      .eq('lessons_report_id', reportId);

    const existingLessonIds = new Set(existingLessons?.map(l => l.lesson_id) || []);

    // Get current max display_order
    const { data: maxOrderData } = await platformDb
      .from('lessons_report_lessons')
      .select('display_order')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1);

    let currentOrder = maxOrderData?.[0]?.display_order || -1;

    // Add lessons that aren't already in report
    const lessonsToAdd = lessons?.filter(l => !existingLessonIds.has(l.id)) || [];
    const addedLessons = [];

    for (const lesson of lessonsToAdd) {
      const significance = lesson.priority === 'high' || lesson.priority === 'critical' ? 'high' : 'medium';
      const section = lesson.effect_type === 'positive' ? 'What Went Well' : 
                     lesson.effect_type === 'negative' ? 'What Did Not Go Well' : 
                     'Other Lessons';

      currentOrder++;

      const { data: added, error: addError } = await platformDb
        .from('lessons_report_lessons')
        .insert({
          lessons_report_id: reportId,
          lesson_id: lesson.id,
          significance_level: significance,
          section_in_report: section,
          display_order: currentOrder
        })
        .select()
        .single();

      if (!addError) {
        addedLessons.push(added);
      }
    }

    return {
      success: true,
      data: {
        added: addedLessons.length,
        skipped: lessons?.length - lessonsToAdd.length || 0,
        lessons: addedLessons
      }
    };
  } catch (error) {
    console.error('Error syncing lessons from log:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reorder lessons
 * @param {string} reportId - Report ID
 * @param {Array} lessonOrders - Array of {id, display_order}
 * @returns {Promise<Object>} Result
 */
export async function reorderLessons(reportId, lessonOrders) {
  try {
    // Update each lesson's display_order
    for (const item of lessonOrders) {
      const { error } = await platformDb
        .from('lessons_report_lessons')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .eq('lessons_report_id', reportId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error reordering lessons:', error);
    return { success: false, error: error.message };
  }
}

export default {
  addLessonToReport,
  removeLessonFromReport,
  getLessonsInReport,
  updateLessonInclusion,
  syncLessonsFromLog,
  reorderLessons
};
