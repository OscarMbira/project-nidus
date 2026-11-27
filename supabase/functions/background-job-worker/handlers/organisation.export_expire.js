/**
 * v1358 Slice 1 — handler for `organisation.export_expire` (daily 02:30 UTC, queued only when there is work).
 *
 * public.organisation_export_due_expiry fails builds with no progress for 24 hours (the owner is told) and
 * lists ready exports past their 7 days. Their ZIP parts are removed through the Storage API
 * (ctx.storageRemove — never by SQL), then the request is marked expired. A Storage error leaves that
 * request ready, so the next day's run tries again; the download policy already refuses expired files.
 */
import { BUCKET } from './organisation.export_build.js'

export async function handle(_payload, ctx) {
  const due = await ctx.rpc('organisation_export_due_expiry', {})
  if (due.error) return { error: `organisation_export_due_expiry: ${due.error.message}` }
  const expired = Array.isArray(due.data?.expired) ? due.data.expired : []

  let processed = 0
  const errors = []
  for (const item of expired) {
    const paths = (Array.isArray(item.files) ? item.files : []).map((f) => f?.path).filter(Boolean)
    if (paths.length) {
      if (typeof ctx.storageRemove !== 'function') return { error: 'The worker adapter has no storageRemove' }
      const res = await ctx.storageRemove(BUCKET, paths)
      if (res?.error) { errors.push(`${item.request_id}: ${res.error.message || res.error}`); continue }
    }
    const mark = await ctx.rpc('organisation_export_mark_expired', { p_request_id: item.request_id })
    if (mark?.error) { errors.push(`${item.request_id}: ${mark.error.message}`); continue }
    processed += 1
  }

  const result = { processed, stale_failed: Number(due.data?.stale_failed) || 0 }
  return errors.length ? { ...result, error: errors.join('; ') } : result
}
