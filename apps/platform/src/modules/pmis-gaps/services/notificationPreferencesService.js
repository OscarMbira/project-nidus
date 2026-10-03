/**
 * Notification Preferences (GAP-21, v963 Phase 15) — per-user channel/frequency/quiet-hours/
 * mute-project settings (public.notification_preferences), plus PMO-admin-managed role-based
 * default templates (public.notification_preference_templates).
 *
 * Genuinely distinct from:
 *  - Notifications.jsx / `notifications` table — the notification inbox/feed itself.
 *  - NotificationRules.jsx / `notification_rules` table — admin-configured event→channel
 *    routing rules.
 * Neither covers per-user preference settings, which is what this service is for.
 *
 * Both tables lack created_by/updated_by columns, so gapDataService's generic
 * createGapRecord/updateGapRecord (which unconditionally injects created_by/updated_by) are not
 * used for writes here — using them would send a nonexistent column and error. Reads reuse
 * gapDataService's listGapRecords/getGapRecord, which only SELECT and are schema-agnostic.
 */
import { platformDb } from '@nidus/supabase'
import { listGapRecords, getGapRecord } from './gapDataService'

/** Small, fixed reference catalog — same precedent as NotificationRules.jsx's own event type
 * list (hardcoded UI options, not DB-sourced). This is a coarser, preference-level grouping
 * distinct from that finer per-event routing-rule taxonomy. */
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
  return platformDb
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

/** The user's own list of projects, for the mute-project picker. */
export async function listMyProjectsForMuting() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data: userRow } = await db().from('users').select('id').eq('auth_user_id', userId).maybeSingle()
  const internalUserId = userRow?.id
  if (!internalUserId) return []
  const { data: memberships } = await db()
    .from('user_projects')
    .select('project_id')
    .eq('user_id', internalUserId)
    .eq('is_deleted', false)
  const projectIds = [...new Set((memberships || []).map((m) => m.project_id))]
  if (!projectIds.length) return []
  const { data: projects, error } = await db()
    .from('projects')
    .select('id, project_name, project_code')
    .in('id', projectIds)
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
  if (error) throw error
  return projects || []
}

// ── Admin role-based templates (PMO Admin) ──────────────────────────────────────

export async function listTemplates() {
  return listGapRecords('notification_preference_templates', { orderBy: 'template_name', ascending: true })
}

export async function getTemplate(id) {
  return getGapRecord('notification_preference_templates', id)
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
