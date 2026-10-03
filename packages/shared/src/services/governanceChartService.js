/**
 * Governance Structure chart gallery (v1098).
 * Private bucket governance-charts; rows in project_governance_charts.
 * Images + PDF; max 10 per project; hard delete removes storage + row.
 */

import { peekSignedImage, resolveSignedImage, invalidateSignedImage } from './signedImageCache'

export const GOVERNANCE_CHARTS_BUCKET = 'governance-charts'
export const MAX_GOVERNANCE_CHARTS = 10
export const MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export const GOVERNANCE_CHART_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export function isGovernanceChartImage(mimeType) {
  return String(mimeType || '').startsWith('image/')
}

export function isGovernanceChartPdf(mimeType) {
  return String(mimeType || '') === 'application/pdf'
}

export function validateGovernanceChartFile(file) {
  if (!file) return 'No file selected.'
  const type = String(file.type || '')
  if (!GOVERNANCE_CHART_MIME_TYPES.includes(type)) {
    return `File type "${type || 'unknown'}" is not allowed — upload PNG, JPEG, GIF, SVG, WEBP, or PDF.`
  }
  if (file.size > MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES) {
    return `File is too large — max ${(MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`
  }
  return null
}

export function isGovernanceChartStoragePath(value) {
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
  if (fromType === 'jpeg') return 'jpg'
  return fromType || 'bin'
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

async function resolveAppUserId(db, authUserId) {
  const { data, error } = await db
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
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

/** List charts for a project (oldest first = upload order). */
export async function listGovernanceCharts(db, projectId) {
  try {
    if (!db || !projectId) throw new Error('Database client and project id are required')
    const { data, error } = await db
      .from('project_governance_charts')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/**
 * Upload a chart file immediately. Enforces max 10.
 * @returns {{ success, data: row } | { success: false, message }}
 */
export async function uploadGovernanceChart(db, file, projectId, caption = '') {
  try {
    if (!db || !file) throw new Error('Database client and file are required')
    if (!projectId) throw new Error('Project id is required')

    const validationError = validateGovernanceChartFile(file)
    if (validationError) throw new Error(validationError)

    const listed = await listGovernanceCharts(db, projectId)
    if (!listed.success) throw listed.error || new Error(listed.message)
    if ((listed.data || []).length >= MAX_GOVERNANCE_CHARTS) {
      throw new Error(`You can add up to ${MAX_GOVERNANCE_CHARTS} governance charts.`)
    }

    const authUserId = await currentAuthUserId(db)
    const appUserId = await resolveAppUserId(db, authUserId)
    const ext = fileExt(file)
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const storagePath = `${projectId}/${authUserId}/${id}.${ext}`

    const uploadError = await uploadWithRetry(db, GOVERNANCE_CHARTS_BUCKET, storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) throw uploadError

    const nextOrder = (listed.data || []).reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), 0) + 1

    const { data, error } = await db
      .from('project_governance_charts')
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        file_name: file.name || `governance-chart.${ext}`,
        mime_type: file.type || null,
        file_size: file.size ?? null,
        caption: String(caption || '').trim() || null,
        sort_order: nextOrder,
        created_by: appUserId,
        updated_by: appUserId,
      })
      .select('*')
      .single()

    if (error) {
      await db.storage.from(GOVERNANCE_CHARTS_BUCKET).remove([storagePath]).catch(() => {})
      throw error
    }

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function updateGovernanceChartCaption(db, chartId, caption) {
  try {
    if (!db || !chartId) throw new Error('Database client and chart id are required')
    const authUserId = await currentAuthUserId(db)
    const appUserId = await resolveAppUserId(db, authUserId)
    const { data, error } = await db
      .from('project_governance_charts')
      .update({
        caption: String(caption || '').trim() || null,
        updated_by: appUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chartId)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Hard-delete: remove storage object then DELETE the DB row.
 */
export async function removeGovernanceChart(db, chart) {
  try {
    if (!db) throw new Error('Database client is required')
    const id = chart?.id
    const path = chart?.storage_path
    if (!id) throw new Error('Chart id is required')

    if (isGovernanceChartStoragePath(path)) {
      invalidateSignedImage(GOVERNANCE_CHARTS_BUCKET, path)
      const { error: removeError } = await db.storage.from(GOVERNANCE_CHARTS_BUCKET).remove([path])
      if (removeError) throw removeError
    }

    const { error } = await db.from('project_governance_charts').delete().eq('id', id)
    if (error) throw error
    return ok(null)
  } catch (error) {
    return fail(error)
  }
}

export function peekGovernanceChartDisplayUrl(storagePath) {
  return peekSignedImage(GOVERNANCE_CHARTS_BUCKET, storagePath)
}

export async function getGovernanceChartSignedUrl(db, storagePath, expiresInSeconds = 86400) {
  try {
    if (!db || !storagePath) throw new Error('Database client and storage path are required')
    if (!isGovernanceChartStoragePath(storagePath)) {
      return ok(storagePath)
    }
    const signedUrl = await resolveSignedImage({
      bucket: GOVERNANCE_CHARTS_BUCKET,
      path: storagePath,
      expiresInSeconds,
      createSignedUrl: async () => {
        const { data, error } = await db.storage
          .from(GOVERNANCE_CHARTS_BUCKET)
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
