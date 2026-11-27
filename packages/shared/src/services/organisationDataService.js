/**
 * v1358 Slice 1 — organisation data export (PRD D2–D4). Platform and Planner (both public schema); the caller
 * passes its Supabase client (platformDb). The database checks that the caller is the Account Owner.
 */
export const EXPORT_BUCKET = 'organisation-exports'
export const DOWNLOAD_LINK_SECONDS = 300

/** { isOwner, requests: [...] } for the caller's organisation (empty when not the owner). */
export async function listOrganisationDataRequests(db) {
  const { data, error } = await db.rpc('organisation_data_requests_list')
  if (error) throw error
  return { isOwner: Boolean(data?.is_owner), requests: Array.isArray(data?.requests) ? data.requests : [] }
}

/** Starts an export; returns { id, status, reference }. Throws with the database’s message when refused. */
export async function requestOrganisationExport(db) {
  const { data, error } = await db.rpc('organisation_data_request_export')
  if (error) throw error
  return data
}

/** A short-lived download link for one ZIP part of a ready export. */
export async function getExportDownloadUrl(db, file) {
  const { data, error } = await db.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(file.path, DOWNLOAD_LINK_SECONDS, { download: file.name || true })
  if (error) throw error
  return data?.signedUrl
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

export const EXPORT_STATUS_LABELS = {
  queued: 'Queued',
  building: 'Being prepared',
  ready: 'Ready to download',
  failed: 'Failed',
  expired: 'Expired',
}
