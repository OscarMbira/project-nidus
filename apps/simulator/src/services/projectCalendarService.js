/**
 * Project Calendar service — Simulator (v963 PMIS Core Gap Closure — Phase 4). Mirrors
 * apps/platform/src/services/projectCalendarService.js against the sim schema, scoped by
 * practice_project_id rather than project_id. Uses simDb (sim schema client) per the Simulator
 * Module Architecture Rules — never platformDb/public schema for simulation data.
 * See SQL/v963b_project_calendar_tables.sql / v963c_project_calendar_rls.sql (sim.* tables).
 * sim.project_calendars / sim.project_calendar_exceptions carry no created_by/updated_by
 * columns — ownership is via sim.practice_projects.user_id (matching the sim schema's own
 * schedule_management_plans convention), so no auth-user resolution is needed for writes here.
 */
import { simDb } from './supabase/supabaseClient'

const CALENDAR_TABLE = 'project_calendars'
const EXCEPTIONS_TABLE = 'project_calendar_exceptions'

// ── Calendar settings (single record per practice project) ─────────────────

export async function getProjectCalendar(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: null }
  const { data, error } = await simDb
    .from(CALENDAR_TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data || null }
}

export async function saveProjectCalendar(practiceProjectId, payload) {
  const existing = await getProjectCalendar(practiceProjectId)

  const row = {
    practice_project_id: practiceProjectId,
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
    const { data, error } = await simDb
      .from(CALENDAR_TABLE)
      .update(row)
      .eq('id', existing.data.id)
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data, operation: 'updated' }
  }

  const { data, error } = await simDb.from(CALENDAR_TABLE).insert(row).select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data, operation: 'created' }
}

// ── Calendar exceptions (list) ──────────────────────────────────────────────

export async function listCalendarExceptions(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [] }
  const { data, error } = await simDb
    .from(EXCEPTIONS_TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('exception_date', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getCalendarException(exceptionId) {
  if (!exceptionId) return { success: true, data: null }
  const { data, error } = await simDb
    .from(EXCEPTIONS_TABLE)
    .select('*')
    .eq('id', exceptionId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data: data || null }
}

export async function createCalendarException(practiceProjectId, payload) {
  const calendarRes = await getProjectCalendar(practiceProjectId)
  const { data, error } = await simDb
    .from(EXCEPTIONS_TABLE)
    .insert({
      practice_project_id: practiceProjectId,
      calendar_id: calendarRes.data?.id || null,
      exception_date: payload.exception_date,
      exception_type: payload.exception_type || 'holiday',
      is_working_day: payload.is_working_day ?? false,
      description: payload.description || null,
    })
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function updateCalendarException(exceptionId, payload) {
  const { data, error } = await simDb
    .from(EXCEPTIONS_TABLE)
    .update({
      exception_date: payload.exception_date,
      exception_type: payload.exception_type || 'holiday',
      is_working_day: payload.is_working_day ?? false,
      description: payload.description || null,
    })
    .eq('id', exceptionId)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function deleteCalendarException(exceptionId) {
  const { error } = await simDb.from(EXCEPTIONS_TABLE).update({ is_deleted: true }).eq('id', exceptionId)
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
