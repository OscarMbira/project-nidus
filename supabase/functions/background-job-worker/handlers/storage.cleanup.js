/**
 * v1352 Slice 3 (3.2) — handler for catalogue job `storage.cleanup` (Saturday 04:00 UTC).
 *
 * 1. public.storage_cleanup_scan lists, per active bucket in public.storage_cleanup_buckets, the files older
 *    than the bucket's safety window that no registered reference column points to. A bucket with a missing
 *    reference column is skipped, never treated as "nothing referenced".
 * 2. Only buckets with delete_enabled (switched on in Admin, reason required, audited) come back with paths;
 *    the others are reported (counts only). A dry run (payload.dry_run) lists nothing for deletion.
 * 3. Paths are removed through the Storage API (ctx.storageRemove — the adapter), never by SQL, in chunks of
 *    100, and each bucket's outcome is recorded (public.storage_cleanup_record).
 * A Storage error fails the item, so the queue retries it once later and Admin is alerted if it stays failed.
 */
const CHUNK = 100

export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export async function handle(payload, ctx) {
  const dryRun = payload?.dry_run === true
  const scan = await ctx.rpc('storage_cleanup_scan', { p_dry_run: dryRun })
  if (scan.error) return { error: `storage_cleanup_scan: ${scan.error.message}` }
  const buckets = Array.isArray(scan.data?.buckets) ? scan.data.buckets : []

  let processed = 0
  let orphans = 0
  const errors = []
  const reportOnly = []
  const skipped = []
  for (const b of buckets) {
    if (b.skipped) { skipped.push({ bucket: b.bucket, reason: b.skipped }); continue }
    orphans += Number(b.orphans) || 0
    const paths = b.delete_enabled && !dryRun && Array.isArray(b.paths) ? b.paths : []
    if (!b.delete_enabled) { if (Number(b.orphans) > 0) reportOnly.push(b.bucket); continue }
    if (paths.length === 0) continue
    if (typeof ctx.storageRemove !== 'function') return { error: 'The worker adapter has no storageRemove, so files cannot be deleted' }

    let deleted = 0
    let failure = null
    for (const part of chunk(paths, CHUNK)) {
      const res = await ctx.storageRemove(b.bucket, part)
      if (res?.error) { failure = res.error.message || String(res.error); break }
      deleted += Number(res?.removed ?? part.length) || 0
    }
    processed += deleted
    const rec = await ctx.rpc('storage_cleanup_record', { p_bucket: b.bucket, p_deleted: deleted, p_error: failure })
    if (rec?.error) ctx.log?.(`[storage.cleanup] could not record ${b.bucket}: ${rec.error.message}`)
    if (failure) errors.push(`${b.bucket}: ${failure}`)
  }

  const result = { processed, orphans, report_only_buckets: reportOnly, skipped, dry_run: dryRun }
  if (errors.length) return { ...result, error: errors.join('; ') }
  return result
}
