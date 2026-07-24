import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Lessons Service
 * Handles lessons identified during checkpoint reporting period
 */

/**
 * Add Lesson to Checkpoint Report
 * @param {string} reportId - Report ID
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export async function addLesson(reportId, lessonData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get max display_order
    const { data: existing } = await supabase
      .from('checkpoint_report_lessons')
      .select('display_order')
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const insertData = {
      ...lessonData,
      checkpoint_report_id: reportId,
      identified_by: lessonData.identified_by || userData.id,
      display_order: lessonData.display_order || (existing?.display_order || 0) + 1,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_lessons')
      .insert(insertData)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding lesson:', error);
    throw error;
  }
}

/**
 * Update Lesson
 * @param {string} lessonId - Lesson ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lesson
 */
export async function updateLesson(lessonId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
}

/**
 * Escalate Lesson to Lessons Log
 * @param {string} lessonId - Lesson ID
 * @param {string} lessonsLogId - Lessons Log ID
 * @returns {Promise<Object>} Updated lesson
 */
export async function escalateToLessonsLog(lessonId, lessonsLogId) {
  try {
    // Get lesson data
    const { data: lesson } = await supabase
      .from('checkpoint_report_lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (!lesson) throw new Error('Lesson not found');

    // Create lesson in lessons log
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get next lesson number
    const { data: lessonsLog } = await supabase
      .from('lessons_logs')
      .select('id')
      .eq('id', lessonsLogId)
      .single();

    if (!lessonsLog) throw new Error('Lessons log not found');

    const { data: lastLesson } = await supabase
      .from('lessons')
      .select('lesson_number')
      .eq('lessons_log_id', lessonsLogId)
      .order('lesson_number', { ascending: false })
      .limit(1)
      .single();

    const lessonNumber = (lastLesson?.lesson_number || 0) + 1;
    const lessonReference = `L-${new Date().getFullYear()}-${String(lessonNumber).padStart(3, '0')}`;

    // Create lesson in lessons table
    const { data: newLesson, error: createError } = await supabase
      .from('lessons')
      .insert({
        lessons_log_id: lessonsLogId,
        lesson_reference: lessonReference,
        lesson_number: lessonNumber,
        title: lesson.lesson_title,
        event_description: lesson.lesson_description,
        effect_description: lesson.lesson_description,
        effect_type: lesson.lesson_type === 'positive' ? 'positive' : 'negative',
        recommendations: lesson.recommendation || '',
        category: lesson.category || 'other',
        priority: lesson.impact === 'high' ? 'high' : lesson.impact === 'medium' ? 'medium' : 'low',
        logged_by_id: userData.id,
        created_by: userData.id
      })
      .select()
      .single();

    if (createError) throw createError;

    // Update checkpoint report lesson to link to lessons log
    return await updateLesson(lessonId, {
      is_escalated: true,
      lessons_log_id: lessonsLogId
    });
  } catch (error) {
    console.error('Error escalating lesson:', error);
    throw error;
  }
}

/**
 * Get Lessons for Report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of lessons
 */
export async function getLessons(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_lessons')
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }
}
