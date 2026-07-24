/**
 * Per-user display-language preference. `users.language_code` (public schema)
 * is shared by Platform and Simulator — a person has one language regardless
 * of which app they're using — so this always reads/writes via platformDb,
 * mirroring accountResolution.js's getCurrentUserInternalUserId().
 *
 * @module utils/userLanguage
 */

import { platformDb } from '@nidus/supabase'

export const DEFAULT_LANGUAGE_CODE = 'en-US'

/**
 * @param {string} userId - public.users.id
 * @returns {Promise<string>} the user's language_code, or the default when unset/unknown
 */
export async function getUserLanguage(userId) {
  if (!userId) return DEFAULT_LANGUAGE_CODE

  const { data, error } = await platformDb
    .from('users')
    .select('language_code')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.language_code) return DEFAULT_LANGUAGE_CODE
  return data.language_code
}

/**
 * @param {string} userId - public.users.id
 * @param {string} languageCode
 * @returns {Promise<{success:boolean, message?:string}>}
 */
export async function updateUserLanguage(userId, languageCode) {
  if (!userId || !languageCode) {
    return { success: false, message: 'User id and language code are required' }
  }

  const { error } = await platformDb
    .from('users')
    .update({ language_code: languageCode, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

export default { DEFAULT_LANGUAGE_CODE, getUserLanguage, updateUserLanguage }
