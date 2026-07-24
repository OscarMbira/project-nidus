/**
 * Practice Daily Log Service
 * CRUD operations for practice daily logs (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeDailyLog(projectId) {
  try {
    const { data, error } = await simDb.from('practice_daily_logs').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeDailyLogEntries(logId, filters = {}) {
  try {
    let query = simDb.from('practice_daily_log_entries').select('*').eq('practice_daily_log_id', logId).eq('is_deleted', false)
    if (filters.entry_date) query = query.eq('entry_date', filters.entry_date)
    if (filters.entry_type) query = query.eq('entry_type', filters.entry_type)
    const { data, error } = await query.order('entry_date', { ascending: false }).order('entry_number', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeDailyLog(projectId, logData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_daily_logs').insert({ ...logData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeDailyLogEntry(logId, entryData) {
  try {
    const userId = await getCurrentUserId()
    const { data: maxEntry } = await simDb.from('practice_daily_log_entries').select('entry_number').eq('practice_daily_log_id', logId).order('entry_number', { ascending: false }).limit(1).single()
    const nextNumber = (maxEntry?.entry_number || 0) + 1
    const { data, error } = await simDb.from('practice_daily_log_entries').insert({ ...entryData, practice_daily_log_id: logId, entry_number: nextNumber, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeDailyLogEntry(entryId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_daily_log_entries').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', entryId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeDailyLog, getPracticeDailyLogEntries, createPracticeDailyLog, createPracticeDailyLogEntry, updatePracticeDailyLogEntry }
