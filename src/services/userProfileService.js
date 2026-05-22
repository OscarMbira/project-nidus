import { platformDb } from './supabaseClient'

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
    updated_at: new Date().toISOString(),
  }
}

/**
 * Update the signed-in user's row in public.users (source of truth for profile fields).
 */
export async function updateUserProfile(profileData) {
  const { data: { user: authUser }, error: authError } = await platformDb.auth.getUser()
  if (authError || !authUser) {
    throw new Error('Session expired. Please sign in again.')
  }

  const { data: userRecord, error: fetchError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!userRecord?.id) {
    throw new Error('Profile record not found. Please contact support.')
  }

  const payload = buildUserProfileUpdatePayload(profileData)

  const { data: updated, error: updateError } = await platformDb
    .from('users')
    .update(payload)
    .eq('id', userRecord.id)
    .select('id, full_name, phone_number, job_title, bio')
    .maybeSingle()

  if (updateError) throw updateError
  if (!updated) {
    throw new Error('Profile could not be updated. Check your permissions and try again.')
  }

  return updated
}
