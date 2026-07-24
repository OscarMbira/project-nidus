import { platformDb } from './supabaseClient'

/** Matches platformDb auth.storageKey in supabase/supabaseClient.js */
const AUTH_STORAGE_KEY = 'project-nidus-auth'
const AUTH_SESSION_TIMEOUT_MS = 15000
const PROFILE_WRITE_TIMEOUT_MS = 45000

/**
 * Reject if promise does not settle in time (UI can always recover).
 */
function withTimeout(promise, ms, label) {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} took longer than ${Math.round(ms / 1000)}s. Check your network or VPN, then try again.`
          )
        ),
      ms
    )
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer))
}

/**
 * Read auth user id from sessionStorage. Avoids getUser() hangs when GoTrue is refreshing.
 */
function readStoredAuthUserId() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.user?.id) return data.user.id
    if (data?.currentSession?.user?.id) return data.currentSession.user.id
    if (Array.isArray(data)) {
      for (const entry of data) {
        const id = entry?.user?.id ?? entry?.currentSession?.user?.id
        if (id) return id
      }
    }
    return null
  } catch {
    return null
  }
}

let _authUserIdInFlight = null

async function getAuthSessionUserId() {
  const stored = readStoredAuthUserId()
  if (stored) return stored

  if (!_authUserIdInFlight) {
    _authUserIdInFlight = (async () => {
      const { data: { user }, error } = await withTimeout(
        platformDb.auth.getUser(),
        AUTH_SESSION_TIMEOUT_MS,
        'Loading your session'
      )
      if (error) throw error
      if (!user?.id) throw new Error('Session expired. Please sign in again.')
      return user.id
    })().finally(() => {
      _authUserIdInFlight = null
    })
  }
  return _authUserIdInFlight
}

/**
 * Build payload for public.users profile update.
 * @param {{ full_name: string, phone?: string, job_title?: string, bio?: string }} profileData
 */
export function buildUserProfileUpdatePayload(profileData) {
  const trimmedName = profileData.full_name?.trim()
  if (!trimmedName) {
    throw new Error('Full name is required')
  }
  return {
    full_name: trimmedName,
    phone_number: profileData.phone?.trim() || null,
    job_title: profileData.job_title?.trim() || null,
    bio: profileData.bio?.trim() || null,
  }
}

/**
 * Update the signed-in user's row in public.users (source of truth for profile fields).
 */
export async function updateUserProfile(profileData) {
  const authUserId = await getAuthSessionUserId()

  const { data: userRecord, error: fetchError } = await withTimeout(
    platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle(),
    PROFILE_WRITE_TIMEOUT_MS,
    'Loading profile'
  )

  if (fetchError) throw fetchError
  if (!userRecord?.id) {
    throw new Error('Profile record not found. Please contact support.')
  }

  const payload = buildUserProfileUpdatePayload(profileData)

  const { data: updated, error: updateError } = await withTimeout(
    platformDb
      .from('users')
      .update(payload)
      .eq('id', userRecord.id)
      .select('id, full_name, phone_number, job_title, bio')
      .maybeSingle(),
    PROFILE_WRITE_TIMEOUT_MS,
    'Saving profile'
  )

  if (updateError) throw updateError
  if (!updated) {
    throw new Error('Profile could not be updated. Check your permissions and try again.')
  }

  return updated
}
