/**
 * User profile picture (v894 PRD/plan). public.users.avatar_url stores a storage
 * PATH (not a public URL) in the private user-avatars bucket — display goes through
 * getAvatarSignedUrl, mirroring the existing saved-signature pattern (v868)
 * so the same proven mechanism is reused rather than a second one invented.
 */

import { peekSignedImage, resolveSignedImage, invalidateSignedImage } from './signedImageCache'

export const USER_AVATARS_BUCKET = 'user-avatars'
export const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const AVATAR_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export function validateAvatarFile(file) {
  if (!file) return 'No file selected.'
  if (!AVATAR_IMAGE_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not allowed — please upload a PNG, JPEG, GIF, or WEBP image.`
  }
  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return `File is too large — max ${(MAX_AVATAR_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
  }
  return null
}

function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const fromType = String(file?.type || '').split('/').pop()
  return fromType || 'png'
}

async function currentAuthUserId(db) {
  if (db.auth.getSession) {
    const { data: sessionData } = await db.auth.getSession()
    if (sessionData?.session?.user?.id) return sessionData.session.user.id
  }
  const { data, error } = await db.auth.getUser()
  if (error || !data?.user?.id) throw new Error('Not signed in.')
  return data.user.id
}

/**
 * Retry a storage upload up to 3 attempts with a short backoff before giving up — a bucket
 * upload can fail on a transient network/edge hiccup even when the bucket, RLS policy, and
 * file are all valid. Same pattern as processTemplateSignatoryService.js's uploadWithRetry()
 * (the saved-signature convenience asset this avatar feature deliberately mirrors) — kept
 * consistent rather than inventing a second retry style.
 */
async function uploadWithRetry(db, bucket, path, file, options) {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt))
    const { error } = await db.storage.from(bucket).upload(path, file, options)
    if (!error) return null
    lastError = error
  }
  return lastError
}

const _userAvatarInFlight = new Map()

/**
 * Current user's avatar storage path (or null) — read from public.users.avatar_url.
 * @param {string} [authUserIdHint] - already-resolved auth user id (e.g. from the page's own
 *   getUser() call) to skip a redundant getSession() round-trip. Falls back to resolving it
 *   here when omitted, so existing callers are unaffected.
 */
export async function getUserAvatar(db, authUserIdHint) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = authUserIdHint || await currentAuthUserId(db)

    // In-flight de-dupe: ProfilePictureSection's own mount effect firing twice under
    // React 18 StrictMode (dev only) was two identical queries for the same user's
    // avatar_url on every profile page load. Not a persistent cache — a call a
    // moment later still runs fresh.
    if (_userAvatarInFlight.has(authUserId)) return _userAvatarInFlight.get(authUserId)

    const run = (async () => {
      const { data, error } = await db
        .from('users')
        .select('avatar_url')
        .eq('auth_user_id', authUserId)
        .maybeSingle()
      if (error) throw error
      return ok(data?.avatar_url || null)
    })()
      .catch((error) => fail(error))
      .finally(() => {
        _userAvatarInFlight.delete(authUserId)
      })

    _userAvatarInFlight.set(authUserId, run)
    return run
  } catch (error) {
    return fail(error)
  }
}

/**
 * Upload a new avatar image and store its path on the current user's row.
 * @param {string} [authUserIdHint] - see getUserAvatar() above.
 */
export async function saveUserAvatar(db, file, accountId, authUserIdHint) {
  try {
    if (!db || !file) throw new Error('Database client and file are required')
    if (!accountId) throw new Error('Account id is required')
    const validationError = validateAvatarFile(file)
    if (validationError) throw new Error(validationError)

    const authUserId = authUserIdHint || await currentAuthUserId(db)
    const ext = fileExt(file)
    const storagePath = `${accountId}/${authUserId}/avatar.${ext}`

    const uploadError = await uploadWithRetry(db, USER_AVATARS_BUCKET, storagePath, file, {
      cacheControl: '3600', upsert: true, contentType: file.type,
    })
    if (uploadError) throw uploadError
    invalidateSignedImage(USER_AVATARS_BUCKET, storagePath)

    const { data, error } = await db
      .from('users')
      .update({ avatar_url: storagePath, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId)
      .select('id, avatar_url')
      .maybeSingle()
    if (error) throw error
    // A 0-row UPDATE (e.g. RLS silently filtered it out) comes back as data: null with
    // no error — falling back to `storagePath` here would report success on a write that
    // never persisted (the image itself uploaded fine, but public.users.avatar_url never
    // pointed at it), leaving the UI showing the old/no picture forever after a reload.
    if (!data) throw new Error('Profile picture uploaded, but could not be saved to your profile. Check your permissions and try again.')
    if (data.id) {
      const { copyAvatarOntoLinkedStakeholders } = await import('./stakeholderPhotoService.js')
      const copied = await copyAvatarOntoLinkedStakeholders(db, {
        platformUserId: data.id,
        avatarPath: data.avatar_url,
      })
      if (!copied.success) {
        throw new Error(copied.message || 'Profile picture saved, but linked stakeholder pictures could not be updated.')
      }
    }
    return ok(data.avatar_url)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Remove the current user's avatar (storage object + clears users.avatar_url).
 * @param {string} [authUserIdHint] - see getUserAvatar() above.
 */
export async function removeUserAvatar(db, authUserIdHint) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = authUserIdHint || await currentAuthUserId(db)
    const current = await getUserAvatar(db, authUserId)
    if (!current.success) throw new Error(current.message)

    if (current.data) {
      invalidateSignedImage(USER_AVATARS_BUCKET, current.data)
      const { error: removeError } = await db.storage.from(USER_AVATARS_BUCKET).remove([current.data])
      if (removeError) throw removeError
    }

    const { error } = await db
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId)
    if (error) throw error
    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

/** Instant display URL if this avatar was already resolved this session (header ↔ profile). */
export function peekAvatarDisplayUrl(storagePath) {
  return peekSignedImage(USER_AVATARS_BUCKET, storagePath)
}

/**
 * Signed URL for display. Longer default expiry than a per-document signature
 * (86400s vs 3600s) — an avatar changes rarely and is shown continuously in the
 * header for the whole session, unlike a signature fetched once per document view.
 * Reuses a cached token for the session so the browser can keep the image bytes.
 */
export async function getAvatarSignedUrl(db, storagePath, expiresInSeconds = 86400) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const signedUrl = await resolveSignedImage({
      bucket: USER_AVATARS_BUCKET,
      path: storagePath,
      expiresInSeconds,
      createSignedUrl: async () => {
        const { data, error } = await db.storage
          .from(USER_AVATARS_BUCKET)
          .createSignedUrl(storagePath, expiresInSeconds)
        if (error) throw error
        return data.signedUrl
      },
    })
    return ok(signedUrl)
  } catch (error) {
    return fail(error)
  }
}
