/**
 * User profile picture (v894 PRD/plan). public.users.avatar_url stores a storage
 * PATH (not a public URL) in the private user-avatars bucket — display goes through
 * getAvatarSignedUrl, mirroring the existing saved-signature pattern (v868)
 * so the same proven mechanism is reused rather than a second one invented.
 */

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
  const { data, error } = await db.auth.getUser()
  if (error || !data?.user?.id) throw new Error('Not signed in.')
  return data.user.id
}

/** Current user's avatar storage path (or null) — read from public.users.avatar_url. */
export async function getUserAvatar(db) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = await currentAuthUserId(db)
    const { data, error } = await db
      .from('users')
      .select('avatar_url')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (error) throw error
    return ok(data?.avatar_url || null)
  } catch (error) {
    return fail(error)
  }
}

/** Upload a new avatar image and store its path on the current user's row. */
export async function saveUserAvatar(db, file, accountId) {
  try {
    if (!db || !file) throw new Error('Database client and file are required')
    if (!accountId) throw new Error('Account id is required')
    const validationError = validateAvatarFile(file)
    if (validationError) throw new Error(validationError)

    const authUserId = await currentAuthUserId(db)
    const ext = fileExt(file)
    const storagePath = `${accountId}/${authUserId}/avatar.${ext}`

    const { error: uploadError } = await db.storage
      .from(USER_AVATARS_BUCKET)
      .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data, error } = await db
      .from('users')
      .update({ avatar_url: storagePath, updated_at: new Date().toISOString() })
      .eq('auth_user_id', authUserId)
      .select('avatar_url')
      .maybeSingle()
    if (error) throw error
    return ok(data?.avatar_url || storagePath)
  } catch (error) {
    return fail(error)
  }
}

/** Remove the current user's avatar (storage object + clears users.avatar_url). */
export async function removeUserAvatar(db) {
  try {
    if (!db) throw new Error('Database client is required')
    const authUserId = await currentAuthUserId(db)
    const current = await getUserAvatar(db)
    if (!current.success) throw new Error(current.message)

    if (current.data) {
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

/**
 * Signed URL for display. Longer default expiry than a per-document signature
 * (86400s vs 3600s) — an avatar changes rarely and is shown continuously in the
 * header for the whole session, unlike a signature fetched once per document view.
 */
export async function getAvatarSignedUrl(db, storagePath, expiresInSeconds = 86400) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const { data, error } = await db.storage
      .from(USER_AVATARS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error) throw error
    return ok(data.signedUrl)
  } catch (error) {
    return fail(error)
  }
}
