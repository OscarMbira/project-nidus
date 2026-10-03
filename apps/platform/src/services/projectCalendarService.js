/**
 * Project Calendar service (v963 PMIS Core Gap Closure — Phase 4). One working-days config
 * record per project (project_calendars) plus a dated list of exceptions
 * (project_calendar_exceptions — holidays and other non-standard working/non-working days).
 * Mirrors apps/simulator/src/services/projectCalendarService.js (sim schema, practice-project
 * scoped). See SQL/v963b_project_calendar_tables.sql / v963c_project_calendar_rls.sql.
 */
import { platformDb } from './supabase/supabaseClient'

const CALENDAR_TABLE = 'project_calendars'
const EXCEPTIONS_TABLE = 'project_calendar_exceptions'

async function resolveUserId(authUserId) {
  if (!authUserId) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle()
  return data?.id || null
}

// ── Calendar settings (single record per project) ──────────────────────────

export async function getProjectCalendar(projectId) {
  if (!projectId) return { success: true, data: null }
  const { data, error } = await platformDb
    .from(CALENDAR_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveProjectCalendar(projectId, payload, authUserId) {
  const uid = await resolveUserId(authUserId)
  const existing = await getProjectCalendar(projectId)

  const row = {
    project_id: projectId,
    monday: payload.monday ?? true,
    tuesday: payload.tuesday ?? true,
    wednesday: payload.wednesday ?? true,
    thursday: payload.thursday ?? true,
    friday: payload.friday ?? true,
    saturday: payload.saturday ?? false,
    sunday: payload.sunday ?? false,
    hours_per_day: payload.hours_per_day ?? 8,
    timezone: payload.timezone || null,
    notes: payload.notes || null,
  }

  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from(CALENDAR_TABLE)
      .update({ ...row, updated_by: uid })
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }

  const { data, error } = await platformDb
    .from(CALENDAR_TABLE)
    .insert({ ...row, created_by: uid })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

// ── Calendar exceptions (list) ──────────────────────────────────────────────

export async function listCalendarExceptions(projectId) {
  if (!projectId) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from(EXCEPTIONS_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('exception_date', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getCalendarException(exceptionId) {
  if (!exceptionId) return { success: true, data: null }
  const { data, error } = await platformDb
    .from(EXCEPTIONS_TABLE)
    .select('*')
    .eq('id', exceptionId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data: data || null }
}

export async function createCalendarException(projectId, payload, authUserId) {
  const uid = await resolveUserId(authUserId)
  const calendarRes = await getProjectCalendar(projectId)
  const { data, error } = await platformDb
    .from(EXCEPTIONS_TABLE)
    .insert({
      project_id: projectId,
      calendar_id: calendarRes.data?.id || null,
      exception_date: payload.exception_date,
      exception_type: payload.exception_type || 'holiday',
      is_working_day: payload.is_working_day ?? false,
      description: payload.description || null,
      created_by: uid,
    })
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function updateCalendarException(exceptionId, payload, authUserId) {
  const uid = await resolveUserId(authUserId)
  const { data, error } = await platformDb
    .from(EXCEPTIONS_TABLE)
    .update({
      exception_date: payload.exception_date,
      exception_type: payload.exception_type || 'holiday',
      is_working_day: payload.is_working_day ?? false,
      description: payload.description || null,
      updated_by: uid,
    })
    .eq('id', exceptionId)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function deleteCalendarException(exceptionId, authUserId) {
  const uid = await resolveUserId(authUserId)
  const { error } = await platformDb
    .from(EXCEPTIONS_TABLE)
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: uid })
    .eq('id', exceptionId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export default {
  getProjectCalendar,
  saveProjectCalendar,
  listCalendarExceptions,
  getCalendarException,
  createCalendarException,
  updateCalendarException,
  deleteCalendarException,
}
