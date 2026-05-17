/**
 * Email Sender Profile Service
 * Maps project types (or system default) to From Email / From Name.
 */

import { appDb } from './supabase/supabaseClient'
import { getEmailConfig, RESEND_DEFAULT_FROM_DOMAIN } from './emailConfigService'

const TABLE = 'email_sender_profiles'
const PROFILE_SELECT = `
  id,
  email_config_id,
  project_type_id,
  profile_name,
  from_email,
  from_name,
  is_default,
  is_active,
  is_deleted,
  created_at,
  updated_at,
  project_types ( id, type_name )
`

/** @returns {boolean} */
/**
 * Normalise and validate profile form input (pure, for tests and UI).
 */
export function parseSenderProfileInput(data) {
  const isDefault = data?.is_default === true
  const projectTypeId = isDefault ? null : (data?.project_type_id || null)
  const errors = []
  if (!String(data?.profile_name || '').trim()) errors.push('Profile name is required.')
  if (!isDefault && !projectTypeId) errors.push('Select a project type or enable System Default.')
  return { isDefault, projectTypeId, errors }
}

export function isValidSenderDomain(fromEmail, domain = RESEND_DEFAULT_FROM_DOMAIN) {
  if (!fromEmail || !domain) return false
  const parts = String(fromEmail).trim().toLowerCase().split('@')
  return parts.length === 2 && parts[1] === domain.toLowerCase()
}

/**
 * Pure resolver for unit tests and client-side preview.
 * @param {string|null|undefined} projectTypeId
 * @param {Array<object>} profiles
 * @param {{ from_email?: string, from_name?: string }} globalConfig
 */
export function resolveSenderFromProfiles(projectTypeId, profiles, globalConfig = {}) {
  const active = (profiles || []).filter((p) => p && !p.is_deleted && p.is_active !== false)

  if (projectTypeId) {
    const match = active.find((p) => p.project_type_id === projectTypeId && !p.is_default)
    if (match) {
      return { from_email: match.from_email, from_name: match.from_name, profile_id: match.id }
    }
  }

  const defaultProfile = active.find((p) => p.is_default)
  if (defaultProfile) {
    return {
      from_email: defaultProfile.from_email,
      from_name: defaultProfile.from_name,
      profile_id: defaultProfile.id,
    }
  }

  return {
    from_email: globalConfig.from_email || null,
    from_name: globalConfig.from_name || 'Project Nidus',
    profile_id: null,
  }
}

async function getActiveEmailConfigId() {
  const { data, error } = await getEmailConfig()
  if (error) throw new Error(error)
  if (!data?.id) throw new Error('No active email configuration. Configure Email Settings first.')
  return data.id
}

/**
 * @returns {Promise<{ success: boolean, data: object[], error: string|null }>}
 */
export async function getSenderProfiles() {
  try {
    const { data, error } = await appDb
      .from(TABLE)
      .select(PROFILE_SELECT)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('profile_name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getSenderProfiles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load sender profiles' }
  }
}

/**
 * @param {string} id
 */
export async function getSenderProfile(id) {
  try {
    const { data, error } = await appDb
      .from(TABLE)
      .select(PROFILE_SELECT)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, data: null, error: 'Profile not found' }
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getSenderProfile:', error)
    return { success: false, data: null, error: error.message || 'Failed to load profile' }
  }
}

/**
 * @param {object} data
 * @param {string} [data.id]
 * @param {string} data.profile_name
 * @param {string|null} data.project_type_id
 * @param {string} data.from_email
 * @param {string} data.from_name
 * @param {boolean} [data.is_default]
 */
export async function saveSenderProfile(data) {
  try {
    const profileName = String(data.profile_name || '').trim()
    const fromEmail = String(data.from_email || '').trim().toLowerCase()
    const fromName = String(data.from_name || '').trim()
    const { isDefault, projectTypeId, errors: inputErrors } = parseSenderProfileInput(data)

    if (inputErrors.length) {
      return { success: false, data: null, error: inputErrors[0] }
    }
    if (!fromName) return { success: false, data: null, error: 'From name is required.' }
    if (!fromEmail) return { success: false, data: null, error: 'From email is required.' }
    if (!isValidSenderDomain(fromEmail)) {
      return {
        success: false,
        data: null,
        error: `From email must use the verified domain @${RESEND_DEFAULT_FROM_DOMAIN}.`,
      }
    }

    const emailConfigId = await getActiveEmailConfigId()

    if (!isDefault && projectTypeId) {
      let dupQuery = appDb
        .from(TABLE)
        .select('id')
        .eq('email_config_id', emailConfigId)
        .eq('project_type_id', projectTypeId)
        .eq('is_deleted', false)
      if (data.id) dupQuery = dupQuery.neq('id', data.id)
      const { data: dup } = await dupQuery.maybeSingle()

      if (dup) {
        return { success: false, data: null, error: 'A profile already exists for this project type.' }
      }
    }

    const payload = {
      email_config_id: emailConfigId,
      project_type_id: projectTypeId,
      profile_name: profileName,
      from_email: fromEmail,
      from_name: fromName,
      is_default: isDefault,
      is_active: true,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    }

    const { data: { user: authUser } } = await appDb.auth.getUser()
    let createdByUserId = null
    if (authUser?.id) {
      const { data: userRow } = await appDb
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()
      createdByUserId = userRow?.id ?? null
    }

    let result
    if (data.id) {
      const { data: updated, error } = await appDb
        .from(TABLE)
        .update(payload)
        .eq('id', data.id)
        .select(PROFILE_SELECT)
        .single()
      if (error) throw error
      result = updated
    } else {
      const insertPayload = createdByUserId
        ? { ...payload, created_by: createdByUserId }
        : payload
      const { data: inserted, error } = await appDb
        .from(TABLE)
        .insert(insertPayload)
        .select(PROFILE_SELECT)
        .single()
      if (error) throw error
      result = inserted
    }

    if (isDefault) {
      await setDefaultProfile(result.id)
      const refreshed = await getSenderProfile(result.id)
      if (refreshed.success) result = refreshed.data
    }

    return { success: true, data: result, error: null }
  } catch (error) {
    console.error('saveSenderProfile:', error)
    return { success: false, data: null, error: error.message || 'Failed to save profile' }
  }
}

/**
 * @param {string} id
 */
export async function deleteSenderProfile(id) {
  try {
    const { data: profile, error: fetchErr } = await appDb
      .from(TABLE)
      .select('id, is_default')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!profile) return { success: false, error: 'Profile not found' }

    if (profile.is_default) {
      const { count, error: countErr } = await appDb
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('is_default', true)

      if (countErr) throw countErr
      if ((count ?? 0) <= 1) {
        return { success: false, error: 'Cannot delete the only system default profile.' }
      }
    }

    const { error } = await appDb
      .from(TABLE)
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteSenderProfile:', error)
    return { success: false, error: error.message || 'Failed to delete profile' }
  }
}

/**
 * @param {string} id
 */
export async function setDefaultProfile(id) {
  try {
    const { data: profile, error: fetchErr } = await appDb
      .from(TABLE)
      .select('email_config_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!profile) return { success: false, error: 'Profile not found' }

    await appDb
      .from(TABLE)
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('email_config_id', profile.email_config_id)
      .eq('is_deleted', false)

    const { error } = await appDb
      .from(TABLE)
      .update({
        is_default: true,
        project_type_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('setDefaultProfile:', error)
    return { success: false, error: error.message || 'Failed to set default profile' }
  }
}

/**
 * @param {string|null|undefined} projectTypeId
 */
export async function resolveProfile(projectTypeId) {
  try {
    const configResult = await getEmailConfig()
    const globalConfig = configResult.data || {}

    const { data: profiles, error } = await appDb
      .from(TABLE)
      .select('id, project_type_id, from_email, from_name, is_default, is_active, is_deleted')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .eq('email_config_id', globalConfig.id || '')

    if (error) throw error

    const resolved = resolveSenderFromProfiles(projectTypeId, profiles, globalConfig)
    return { success: true, data: resolved, error: null }
  } catch (error) {
    console.error('resolveProfile:', error)
    return { success: false, data: null, error: error.message || 'Failed to resolve sender profile' }
  }
}

/**
 * Active project types for dropdowns.
 */
export async function getActiveProjectTypes() {
  try {
    const { data, error } = await appDb
      .from('project_types')
      .select('id, type_name, type_code')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('type_name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getActiveProjectTypes:', error)
    return { success: false, data: [], error: error.message || 'Failed to load project types' }
  }
}
