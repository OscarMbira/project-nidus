/**
 * End Project Report Lessons Service
 * Manages lessons learned and escalation to corporate
 */

import { supabase } from './supabaseClient'

/**
 * Add Lesson
 * @param {string} reportId - Report ID
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export async function addLesson(reportId, lessonData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_project_report_id: reportId,
      lesson_type: lessonData.lesson_type,
      category: lessonData.category,
      title: lessonData.title,
      description: lessonData.description,
      impact: lessonData.impact || null,
      root_cause: lessonData.root_cause || null,
      recommendation: lessonData.recommendation || null,
      target_audience: lessonData.target_audience || null,
      applicability_scope: lessonData.applicability_scope || null,
      identified_by: lessonData.identified_by || userData.user.id,
      display_order: lessonData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_lessons')
      .insert(insertData)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email),
        corporate_lesson:corporate_lesson_id(id, lesson_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding lesson:', error)
    throw error
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
    const { data, error } = await supabase
      .from('end_project_report_lessons')
      .update(updates)
      .eq('id', lessonId)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email),
        corporate_lesson:corporate_lesson_id(id, lesson_title)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating lesson:', error)
    throw error
  }
}

/**
 * Delete Lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<void>}
 */
export async function deleteLesson(lessonId) {
  try {
    const { error } = await supabase
      .from('end_project_report_lessons')
      .delete()
      .eq('id', lessonId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting lesson:', error)
    throw error
  }
}

/**
 * Escalate to Corporate
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<string>} Corporate lesson ID
 */
export async function escalateToCorporate(lessonId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('escalate_lesson_to_corporate', {
      p_lesson_id: lessonId,
      p_user_id: userData.user.id
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error escalating lesson:', error)
    throw error
  }
}

/**
 * Get Lessons Summary
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Lessons summary
 */
export async function getLessonsSummary(reportId) {
  try {
    const { data: lessons, error } = await supabase
      .from('end_project_report_lessons')
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email),
        corporate_lesson:corporate_lesson_id(id, lesson_title)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error

    const summary = {
      total: lessons?.length || 0,
      what_went_well: lessons?.filter(l => l.lesson_type === 'what_went_well').length || 0,
      what_went_badly: lessons?.filter(l => l.lesson_type === 'what_went_badly').length || 0,
      recommendations: lessons?.filter(l => l.lesson_type === 'recommendation').length || 0,
      escalated: lessons?.filter(l => l.is_escalated_corporate).length || 0,
      lessons: lessons || []
    }

    return summary
  } catch (error) {
    console.error('Error fetching lessons summary:', error)
    throw error
  }
}

/**
 * Get Lessons
 * @param {string} reportId - Report ID
 * @param {string} lessonType - Optional filter by type
 * @returns {Promise<Array>} Lessons
 */
export async function getLessons(reportId, lessonType = null) {
  try {
    let query = supabase
      .from('end_project_report_lessons')
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email),
        corporate_lesson:corporate_lesson_id(id, lesson_title)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (lessonType) {
      query = query.eq('lesson_type', lessonType)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching lessons:', error)
    throw error
  }
}
