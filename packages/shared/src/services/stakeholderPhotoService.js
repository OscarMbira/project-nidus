/**
 * Stakeholder picture (v1147). photo_path stores a private storage path in
 * stakeholder-photos. A linked user's profile picture is copied here so
 * removing the profile picture does not wipe the stakeholder record.
 * Practice rows are never updated from a profile picture.
 */

import { peekSignedImage, resolveSignedImage, invalidateSignedImage } from './signedImageCache'
import { USER_AVATARS_BUCKET, validateAvatarFile } from './userAvatarService'

export const STAKEHOLDER_PHOTOS_BUCKET = 'stakeholder-photos'

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName.length <= 5 && fromName !== String(file?.name || '')) return fromName.toLowerCase()
  const fromType = String(file?.type || '').split('/').pop()
  return (fromType || 'png').toLowerCase()
}

export function stakeholderPhotoLabel(category) {
  return category && category !== 'individual' ? 'Logo' : 'Photo'
}

export function stakeholderInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Upload / Paste / Remove stay available unless a linked Platform user currently has a profile picture. */
export function stakeholderPhotoControlsVisible({ isPractice = false, linkedUserHasAvatar = false } = {}) {
  if (isPractice) return true
  return !linkedUserHasAvatar
}

export function platformStakeholderPhotoPath(accountId, stakeholderId, ext) {
  return `${accountId}/stakeholders/${stakeholderId}/photo.${ext || 'png'}`
}

export function practiceStakeholderPhotoPath(ownerUserId, stakeholderId, ext) {
  return `${ownerUserId}/practice-stakeholders/${stakeholderId}/photo.${ext || 'png'}`
}

function storageError(error) {
  const message = String(error?.message || 'Upload failed')
  const status = error?.statusCode || error?.status
  if (status && !message.includes(String(status))) return new Error(`${message} (${status})`)
  return new Error(message)
}

/** New object each time. upsert on photo.png stayed queued behind the timed-out 544 requests. */
async function uploadWithRetry(db, path, file) {
  const { error } = await db.storage.from(STAKEHOLDER_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/png',
  })
  return error ? storageError(error) : null
}

async function removeStoredPhoto(db, photoPath) {
  if (!photoPath) return
  invalidateSignedImage(STAKEHOLDER_PHOTOS_BUCKET, photoPath)
  const { error } = await db.storage.from(STAKEHOLDER_PHOTOS_BUCKET).remove([photoPath])
  if (error) throw error
}

/**
 * Delete the stakeholder-owned file. Never touches user-avatars.
 */
export async function deleteStoredStakeholderPhoto(db, photoPath) {
  try {
    if (!db) throw new Error('Database client is required')
    if (!photoPath) return ok(null)
    await removeStoredPhoto(db, photoPath)
    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

export async function linkedUserHasProfilePhoto(db, userId) {
  try {
    if (!db || !userId) return ok(false)
    const { data, error } = await db.from('users').select('avatar_url').eq('id', userId).maybeSingle()
    if (error) throw error
    return ok(Boolean(data?.avatar_url))
  } catch (error) {
    return fail(error)
  }
}

export async function saveStakeholderPhoto(db, {
  table = 'stakeholders',
  id,
  accountId,
  ownerUserId,
  file,
  previousPath = null,
  isPractice = false,
} = {}) {
  try {
    if (!db || !file || !id) throw new Error('Database client, file, and stakeholder id are required')
    const validationError = validateAvatarFile(file)
    if (validationError) throw new Error(validationError)
    const ext = fileExt(file)
    const leaf = `photo-${Date.now()}.${ext}`
    const storagePath = isPractice
      ? `${ownerUserId}/practice-stakeholders/${id}/${leaf}`
      : `${accountId}/stakeholders/${id}/${leaf}`
    if (isPractice && !ownerUserId) throw new Error('Practice owner is required')
    if (!isPractice && !accountId) throw new Error('Account id is required')

    const uploadError = await uploadWithRetry(db, storagePath, file)
    if (uploadError) throw uploadError
    invalidateSignedImage(STAKEHOLDER_PHOTOS_BUCKET, storagePath)

    if (previousPath && previousPath !== storagePath) {
      await removeStoredPhoto(db, previousPath)
    }

    const { data, error } = await Promise.race([
      db
        .from(table)
        .update({ photo_path: storagePath, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('photo_path')
        .maybeSingle(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('The stakeholder record is locked. Close any open SQL editor query, then try again.')), 8000)
      }),
    ])
    if (error) throw error
    if (!data) throw new Error('Picture uploaded, but could not be saved on the stakeholder. Check your permissions and try again.')
    return ok(data.photo_path)
  } catch (error) {
    return fail(error)
  }
}

export async function removeStakeholderPhoto(db, { table = 'stakeholders', id, photoPath } = {}) {
  try {
    if (!db || !id) throw new Error('Database client and stakeholder id are required')
    if (photoPath) await removeStoredPhoto(db, photoPath)
    const { error } = await db
      .from(table)
      .update({ photo_path: null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

async function copyAvatarBlobOntoRow(db, row, avatarPath) {
  const { data: blob, error: downloadError } = await db.storage.from(USER_AVATARS_BUCKET).download(avatarPath)
  if (downloadError) throw downloadError
  const ext = String(avatarPath.split('.').pop() || 'png').toLowerCase()
  const dest = platformStakeholderPhotoPath(row.account_id, row.id, ext)
  const body = blob instanceof Blob ? blob : new Blob([blob])
  const file = body.type ? body : new Blob([body], { type: 'image/png' })
  const uploadError = await uploadWithRetry(db, dest, file)
  if (uploadError) throw uploadError
  invalidateSignedImage(STAKEHOLDER_PHOTOS_BUCKET, dest)
  if (row.photo_path && row.photo_path !== dest) {
    await removeStoredPhoto(db, row.photo_path)
  }
  const { error } = await db
    .from('stakeholders')
    .update({ photo_path: dest, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (error) throw error
  return dest
}

/**
 * Replace the picture on every non-deleted Platform stakeholder linked to this user.
 * Does not read or write sim.practice_stakeholder_register.
 */
export async function copyAvatarOntoLinkedStakeholders(db, { platformUserId, avatarPath } = {}) {
  try {
    if (!db || !platformUserId || !avatarPath) return ok([])
    const { data: rows, error } = await db
      .from('stakeholders')
      .select('id, account_id, photo_path')
      .eq('user_id', platformUserId)
      .eq('is_deleted', false)
    if (error) throw error
    const updated = []
    for (const row of rows || []) {
      if (!row?.id || !row.account_id) continue
      updated.push(await copyAvatarBlobOntoRow(db, row, avatarPath))
    }
    return ok(updated)
  } catch (error) {
    return fail(error)
  }
}

const _ensureInFlight = new Map()

/**
 * First time a linked stakeholder with no picture is shown, copy the profile picture
 * so a later profile removal cannot leave the record blank.
 */
export async function ensureStakeholderPhotoFromProfile(db, stakeholder) {
  try {
    if (!stakeholder?.id || !stakeholder.user_id || stakeholder.photo_path) {
      return ok(stakeholder?.photo_path || null)
    }
    if (!stakeholder.account_id) return ok(null)
    if (_ensureInFlight.has(stakeholder.id)) return _ensureInFlight.get(stakeholder.id)

    const run = (async () => {
      const { data: user, error } = await db
        .from('users')
        .select('avatar_url')
        .eq('id', stakeholder.user_id)
        .maybeSingle()
      if (error) throw error
      if (!user?.avatar_url) return ok(null)
      const dest = await copyAvatarBlobOntoRow(db, {
        id: stakeholder.id,
        account_id: stakeholder.account_id,
        photo_path: null,
      }, user.avatar_url)
      return ok(dest)
    })()
      .catch((error) => fail(error))
      .finally(() => {
        _ensureInFlight.delete(stakeholder.id)
      })

    _ensureInFlight.set(stakeholder.id, run)
    return run
  } catch (error) {
    return fail(error)
  }
}

export function peekStakeholderPhotoDisplayUrl(storagePath) {
  return peekSignedImage(STAKEHOLDER_PHOTOS_BUCKET, storagePath)
}

export async function getStakeholderPhotoSignedUrl(db, storagePath, expiresInSeconds = 86400) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    const signedUrl = await resolveSignedImage({
      bucket: STAKEHOLDER_PHOTOS_BUCKET,
      path: storagePath,
      expiresInSeconds,
      createSignedUrl: async () => {
        const { data, error } = await db.storage
          .from(STAKEHOLDER_PHOTOS_BUCKET)
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
