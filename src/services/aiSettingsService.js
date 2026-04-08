/**
 * AI Settings Service (Phase 4)
 * Org-level AI data answer mode and privacy. Syncs public.ai_settings and sim.ai_settings.
 */

import { platformDb } from './supabase/supabaseClient'
import { simDb } from './supabase/supabaseClient'

/**
 * Get full AI settings for an organisation (for settings page).
 * @param {string} orgId - organisation_id (accounts.id)
 * @returns {Promise<{ data_answer_mode, data_privacy_accepted_at, insights_enabled?, insights_mode? }|null>}
 */
export async function getSettings(orgId) {
  if (!orgId) return null
  const { data, error } = await platformDb
    .from('ai_settings')
    .select('data_answer_mode, data_privacy_accepted_at, insights_enabled, insights_mode')
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (error) {
    const { data: fallback } = await platformDb
      .from('ai_settings')
      .select('data_answer_mode, data_privacy_accepted_at, insights_enabled')
      .eq('organisation_id', orgId)
      .maybeSingle()
    const d = fallback
    return d ? { ...d, insights_mode: 'template' } : {
      data_answer_mode: 'template',
      data_privacy_accepted_at: null,
      insights_enabled: true,
      insights_mode: 'template',
    }
  }
  return data ? { ...data, insights_mode: data.insights_mode ?? 'template' } : {
    data_answer_mode: 'template',
    data_privacy_accepted_at: null,
    insights_enabled: true,
    insights_mode: 'template',
  }
}

/**
 * Update AI settings and sync to sim.ai_settings (Platform–Simulator parity).
 * @param {string} orgId - organisation_id (accounts.id)
 * @param {{ data_answer_mode?, set_privacy_accepted?: boolean, insights_enabled?: boolean, insights_mode?: 'template'|'gemini' }} payload
 */
export async function updateSettings(orgId, payload) {
  if (!orgId) throw new Error('Organisation ID required')
  const current = await getSettings(orgId) || {
    data_answer_mode: 'template',
    data_privacy_accepted_at: null,
    insights_enabled: true,
    insights_mode: 'template',
  }
  const now = new Date().toISOString()
  const mode = payload.data_answer_mode ?? current.data_answer_mode
  const privacyAccepted =
    payload.set_privacy_accepted === true ? now
    : mode === 'template' ? null
    : current.data_privacy_accepted_at
  const insightsEnabled = payload.insights_enabled !== undefined ? payload.insights_enabled : current.insights_enabled
  const insightsMode = payload.insights_mode ?? current.insights_mode ?? 'template'

  const platformRow = {
    organisation_id: orgId,
    data_answer_mode: mode,
    data_privacy_accepted_at: privacyAccepted,
    insights_enabled: insightsEnabled,
    insights_mode: insightsMode,
    updated_at: now,
  }

  const { error: platformError } = await platformDb
    .from('ai_settings')
    .upsert(platformRow, { onConflict: 'organisation_id' })
  if (platformError) throw new Error(platformError.message || 'Failed to save AI settings')

  const simPayload = {
    organisation_id: orgId,
    data_answer_mode: platformRow.data_answer_mode,
    data_privacy_accepted_at: platformRow.data_privacy_accepted_at,
    insights_enabled: platformRow.insights_enabled,
    insights_mode: platformRow.insights_mode,
  }
  const { error: simError } = await simDb
    .from('ai_settings')
    .upsert(simPayload, { onConflict: 'organisation_id' })
  if (simError) console.warn('[aiSettings] sim.ai_settings sync warning:', simError)
}

/**
 * Resolve organisation (account) ID for the current user (for widget/workspace footer and sendMessage).
 * @param {string} authUserId - auth user id from supabase.auth.getUser().user.id
 * @returns {Promise<string|null>}
 */
export async function getOrgIdForUser(authUserId) {
  if (!authUserId) return null
  try {
    const { data: userRow } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    const platformUserId = userRow?.id
    if (!platformUserId) return null
    const { data: accountRow } = await platformDb
      .from('accounts')
      .select('id')
      .eq('owner_user_id', platformUserId)
      .limit(1)
      .maybeSingle()
    if (accountRow?.id) return accountRow.id
    const { data: projectRow } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('owner_user_id', platformUserId)
      .eq('is_deleted', false)
      .not('account_id', 'is', null)
      .limit(1)
      .maybeSingle()
    return projectRow?.account_id ?? null
  } catch {
    return null
  }
}

/**
 * Privacy notice text per data_answer_mode (for widget footer and workspace status bar).
 * @param {string} mode - 'template' | 'claude' | 'gemini'
 */
export function getPrivacyNoticeText(mode) {
  switch (mode) {
    case 'template':
      return 'Your data is queried from your database. No data is sent externally.'
    case 'claude':
      return 'Your data is queried from your database. Summary may use AI (Anthropic Claude).'
    case 'gemini':
      return 'Your data is queried from your database. Summary may use AI (Google Gemini).'
    default:
      return 'Your data is queried from your database. Summary may use AI (Gemini).'
  }
}
