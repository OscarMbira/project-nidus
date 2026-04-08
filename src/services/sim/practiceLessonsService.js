/**
 * Practice Lessons Service
 * CRUD operations for practice lessons log (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeLessonsLog(projectId) {
  try {
    const { data, error } = await simDb.from('practice_lessons_log').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeLessonEntries(logId, filters = {}) {
  try {
    let query = simDb.from('practice_lesson_entries').select('*').eq('practice_lessons_log_id', logId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.effect_type) query = query.eq('effect_type', filters.effect_type)
    const { data, error } = await query.order('identified_date', { ascending: false }).order('lesson_number', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeLessonsLog(projectId, logData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_lessons_log').insert({ ...logData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeLessonEntry(logId, entryData) {
  try {
    const userId = await getCurrentUserId()
    const { data: maxEntry } = await simDb.from('practice_lesson_entries').select('lesson_number').eq('practice_lessons_log_id', logId).order('lesson_number', { ascending: false }).limit(1).maybeSingle()
    const nextNumber = (maxEntry?.lesson_number || 0) + 1
    const { data, error } = await simDb.from('practice_lesson_entries').insert({ ...entryData, practice_lessons_log_id: logId, lesson_number: nextNumber, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeLessonEntry(entryId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_lesson_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', entryId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeLessonsReport(projectId, reportData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_lessons_reports').insert({ ...reportData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeLessonsLog, getPracticeLessonEntries, createPracticeLessonsLog, createPracticeLessonEntry, updatePracticeLessonEntry, createPracticeLessonsReport }
