/**
 * Project Brief team-structure diagram upload (v1068).
 * Stores a private storage PATH on project_briefs.team_structure_diagram_url
 * (or in form state before the brief row exists). Display via signed URLs.
 */

import { peekSignedImage, resolveSignedImage, invalidateSignedImage } from './signedImageCache'

export const BRIEF_TEAM_DIAGRAMS_BUCKET = 'brief-team-diagrams'
export const MAX_BRIEF_DIAGRAM_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const BRIEF_DIAGRAM_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export function validateBriefDiagramFile(file) {
  if (!file) return 'No file selected.'
  if (!BRIEF_DIAGRAM_IMAGE_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type || 'unknown'}" is not allowed — please upload a PNG, JPEG, GIF, SVG, or WEBP image.`
  }
  if (file.size > MAX_BRIEF_DIAGRAM_FILE_SIZE_BYTES) {
    return `File is too large — max ${(MAX_BRIEF_DIAGRAM_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
  }
  return null
}

/** True when the column holds a storage path rather than a legacy external URL. */
export function isBriefDiagramStoragePath(value) {
  if (!value || typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  if (/^https?:\/\//i.test(v) || v.startsWith('data:') || v.startsWith('blob:')) return false
  return true
}

function fileExt(file) {
  const fromName = String(file?.name || '').split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const fromType = String(file?.type || '').split('/').pop()
  if (fromType === 'svg+xml') return 'svg'
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

/**
 * Upload diagram image; returns the storage path to store in team_structure_diagram_url.
 * When briefId is provided, also updates project_briefs immediately.
 */
export async function saveBriefTeamStructureDiagram(db, file, projectId, briefId = null) {
  try {
    if (!db || !file) throw new Error('Database client and file are required')
    if (!projectId) throw new Error('Project id is required')
    const validationError = validateBriefDiagramFile(file)
    if (validationError) throw new Error(validationError)

    const authUserId = await currentAuthUserId(db)
    const ext = fileExt(file)
    const storagePath = `${projectId}/${authUserId}/team-structure-diagram.${ext}`

    const uploadError = await uploadWithRetry(db, BRIEF_TEAM_DIAGRAMS_BUCKET, storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })
    if (uploadError) throw uploadError
    invalidateSignedImage(BRIEF_TEAM_DIAGRAMS_BUCKET, storagePath)

    if (briefId) {
      const { data, error } = await db
        .from('project_briefs')
        .update({
          team_structure_diagram_url: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', briefId)
        .select('team_structure_diagram_url')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        throw new Error(
          'Diagram uploaded, but could not be saved on the brief. Check your permissions and try again.',
        )
      }
      return ok(data.team_structure_diagram_url)
    }

    return ok(storagePath)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Remove diagram from storage and clear the brief column when briefId is set.
 * @param {string|null} currentPath - current team_structure_diagram_url value
 */
export async function removeBriefTeamStructureDiagram(db, currentPath, briefId = null) {
  try {
    if (!db) throw new Error('Database client is required')

    if (isBriefDiagramStoragePath(currentPath)) {
      invalidateSignedImage(BRIEF_TEAM_DIAGRAMS_BUCKET, currentPath)
      const { error: removeError } = await db.storage
        .from(BRIEF_TEAM_DIAGRAMS_BUCKET)
        .remove([currentPath])
      if (removeError) throw removeError
    }

    if (briefId) {
      const { error } = await db
        .from('project_briefs')
        .update({
          team_structure_diagram_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', briefId)
      if (error) throw error
    }

    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

export function peekBriefDiagramDisplayUrl(storagePath) {
  return peekSignedImage(BRIEF_TEAM_DIAGRAMS_BUCKET, storagePath)
}

export async function getBriefDiagramSignedUrl(db, storagePath, expiresInSeconds = 86400) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    if (!isBriefDiagramStoragePath(storagePath)) {
      return ok(storagePath)
    }
    const signedUrl = await resolveSignedImage({
      bucket: BRIEF_TEAM_DIAGRAMS_BUCKET,
      path: storagePath,
      expiresInSeconds,
      createSignedUrl: async () => {
        const { data, error } = await db.storage
          .from(BRIEF_TEAM_DIAGRAMS_BUCKET)
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
