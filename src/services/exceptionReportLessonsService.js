/**
 * Exception Report Lessons Service
 * Manages lessons learned from exception reports
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

    // Get next display order
    const { data: existingLessons } = await supabase
      .from('exception_report_lessons')
      .select('display_order')
      .eq('exception_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = existingLessons && existingLessons.length > 0
      ? existingLessons[0].display_order + 1
      : 0

    const insertData = {
      exception_report_id: reportId,
      lesson_type: lessonData.lesson_type || 'for_this_project',
      lesson_title: lessonData.lesson_title || '',
      lesson_description: lessonData.lesson_description || '',
      category: lessonData.category || null,
      recommendation: lessonData.recommendation || null,
      preventive_action: lessonData.preventive_action || null,
      is_escalated_corporate: lessonData.is_escalated_corporate || false,
      corporate_lesson_id: lessonData.corporate_lesson_id || null,
      identified_by: userData.user.id,
      display_order: lessonData.display_order || nextDisplayOrder
    }

    const { data, error } = await supabase
      .from('exception_report_lessons')
      .insert(insertData)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
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
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('exception_report_lessons')
      .update(updates)
      .eq('id', lessonId)
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
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
      .from('exception_report_lessons')
      .delete()
      .eq('id', lessonId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting lesson:', error)
    throw error
  }
}

/**
 * Get Lessons
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Lessons
 */
export async function getLessons(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_lessons')
      .select(`
        *,
        identified_by_user:identified_by(id, full_name, email)
      `)
      .eq('exception_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching lessons:', error)
    throw error
  }
}

/**
 * Escalate Lesson to Corporate
 * @param {string} lessonId - Lesson ID
 * @param {string} corporateLessonId - Corporate lesson ID (if already exists)
 * @returns {Promise<Object>} Updated lesson
 */
export async function escalateLessonToCorporate(lessonId, corporateLessonId = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get lesson details
    const { data: lesson } = await supabase
      .from('exception_report_lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    // Create corporate lesson if not provided
    let finalCorporateLessonId = corporateLessonId

    if (!finalCorporateLessonId) {
      // Create in lessons_learned table if it exists
      const { data: corporateLesson, error: createError } = await supabase
        .from('lessons_learned')
        .insert({
          lesson_title: lesson.lesson_title,
          lesson_description: lesson.lesson_description,
          lesson_category: lesson.category || 'other',
          source_type: 'exception_report',
          created_by: userData.user.id
        })
        .select('id')
        .single()

      if (!createError && corporateLesson) {
        finalCorporateLessonId = corporateLesson.id
      }
    }

    // Update lesson with escalation
    const updates = {
      is_escalated_corporate: true,
      corporate_lesson_id: finalCorporateLessonId
    }

    return await updateLesson(lessonId, updates)
  } catch (error) {
    console.error('Error escalating lesson to corporate:', error)
    throw error
  }
}
