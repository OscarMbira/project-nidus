/**
 * Notification Preferences (GAP-21, v963 Phase 15) — Simulator mirror of Platform's
 * notificationPreferencesService.js, on sim.notification_preferences /
 * sim.notification_preference_templates.
 * See SQL/v963p_pmis_gap_phase15_notification_preferences_sim_and_rls.sql.
 *
 * listMyProjectsForMuting() is adapted for the sim schema: sim has no internal
 * users-table indirection (unlike public.users.auth_user_id) and no
 * user_projects join table — practice projects are single-owner
 * (sim.practice_projects.user_id = auth.uid()), so muting options are just the
 * current user's own practice projects, queried directly.
 *
 * sim.notification_preference_templates has no PMO-admin concept (open read/write
 * to any authenticated user, per the migration's RLS) — unlike Platform, this
 * service does not gate template writes client-side either; the menu placement
 * (PMO area) is the only access control layer, consistent with other sim
 * shared-reference-table features.
 */
import { simDb } from '@nidus/supabase'
import { listGapRecords, getGapRecord } from './gapDataService'

export const NOTIFICATION_EVENT_CATEGORIES = [
  { value: 'risk_updates', label: 'Risk Updates' },
  { value: 'issue_updates', label: 'Issue Updates' },
  { value: 'task_updates', label: 'Task Updates' },
  { value: 'approvals', label: 'Approvals & Sign-off' },
  { value: 'mentions', label: 'Mentions & Comments' },
  { value: 'reports', label: 'Reports & Digests' },
  { value: 'system', label: 'System & Account' },
]

export const NOTIFICATION_FREQUENCIES = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily_digest', label: 'Daily digest' },
  { value: 'weekly_digest', label: 'Weekly digest' },
  { value: 'off', label: 'Off' },
]

/** Pseudo-category row used to hold the account-wide quiet hours + muted projects settings. */
export const GENERAL_SETTINGS_CATEGORY = 'general'

function db() {
  return simDb
}

async function currentUserId() {
  const {
    data: { user },
  } = await db().auth.getUser()
  return user?.id || null
}

/** All of the current user's preference rows (one per event_category, if configured). */
export async function getMyPreferences() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await db()
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data || []
}

/** Upsert one preference row for the current user (unique on user_id + event_category). */
export async function upsertMyPreference({
  eventCategory,
  channelInApp = true,
  channelEmail = true,
  channelPush = false,
  frequency = 'instant',
  muteProjectIds = null,
  quietHoursStart = null,
  quietHoursEnd = null,
}) {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in to update notification preferences.')
  if (!eventCategory) throw new Error('eventCategory is required')

  const row = {
    user_id: userId,
    event_category: eventCategory,
    channel_in_app: channelInApp,
    channel_email: channelEmail,
    channel_push: channelPush,
    frequency,
    updated_at: new Date().toISOString(),
  }
  if (muteProjectIds !== null) row.mute_project_ids = muteProjectIds
  if (quietHoursStart !== null) row.quiet_hours_start = quietHoursStart || null
  if (quietHoursEnd !== null) row.quiet_hours_end = quietHoursEnd || null

  const { data, error } = await db()
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id,event_category' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** The user's own practice projects, for the mute-project picker. */
export async function listMyProjectsForMuting() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data: projects, error } = await db()
    .from('practice_projects')
    .select('id, project_name, project_code')
    .eq('user_id', userId)
    .order('project_name', { ascending: true })
  if (error) throw error
  return projects || []
}

// ── Templates (shared reference content — no PMO-admin gate in sim) ─────────

export async function listTemplates() {
  return listGapRecords('notification_preference_templates', { sim: true, orderBy: 'template_name', ascending: true })
}

export async function getTemplate(id) {
  return getGapRecord('notification_preference_templates', id, { sim: true })
}

export async function createTemplate({ templateName, roleName, eventCategory, channelInApp, channelEmail, channelPush, frequency }) {
  if (!templateName?.trim()) throw new Error('Template name is required')
  if (!eventCategory) throw new Error('Event category is required')
  const { data, error } = await db()
    .from('notification_preference_templates')
    .insert({
      template_name: templateName.trim(),
      role_name: roleName || null,
      event_category: eventCategory,
      channel_in_app: !!channelInApp,
      channel_email: !!channelEmail,
      channel_push: !!channelPush,
      frequency: frequency || 'instant',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id, { templateName, roleName, eventCategory, channelInApp, channelEmail, channelPush, frequency }) {
  if (!templateName?.trim()) throw new Error('Template name is required')
  const { data, error } = await db()
    .from('notification_preference_templates')
    .update({
      template_name: templateName.trim(),
      role_name: roleName || null,
      event_category: eventCategory,
      channel_in_app: !!channelInApp,
      channel_email: !!channelEmail,
      channel_push: !!channelPush,
      frequency: frequency || 'instant',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id) {
  const { error } = await db()
    .from('notification_preference_templates')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export default {
  NOTIFICATION_EVENT_CATEGORIES,
  NOTIFICATION_FREQUENCIES,
  GENERAL_SETTINGS_CATEGORY,
  getMyPreferences,
  upsertMyPreference,
  listMyProjectsForMuting,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
}
