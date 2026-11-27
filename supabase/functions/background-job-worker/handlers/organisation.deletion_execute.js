/**
 * v1358 Slice 3b — handler for `organisation.deletion_execute` (queued by the lifecycle job on day 30, and again
 * by itself or the lifecycle job to carry on). Payload: { record_id }.
 *
 * 1. public.organisation_deletion_context: the record's state, the next Storage files to remove, a legal hold.
 * 2. Files: removed through the Storage API in chunks; "not found" counts as removed; any other Storage error
 *    stops the run (the queue retries), so files are not silently left behind.
 * 3. Rows: public.organisation_deletion_step deletes in batches (children before parents) for up to STEP_MS per
 *    call; public.organisation_deletion_finish then checks nothing is left, applies D8 to members, anonymises
 *    the organisation row and completes the record.
 * 4. Certificate: the PDF (deletionCertificate.js) is stored in the private bucket organisation-deletion-certificates
 *    (<record id>/deletion-certificate-<reference>.pdf) and emailed to the Account Owner (and the requester, if
 *    different) through send-email; public.organisation_deletion_certificate_saved then clears their addresses.
 * When the time budget is used up, the handler queues itself again. A legal hold pauses it (the lifecycle job
 * resumes it once the hold is lifted). Errors are noted on the record and returned, so the queue retries with
 * back-off and Admin is alerted when it gives up.
 */
import { buildCertificatePdf, toBase64 } from '../deletionCertificate.js'

export const BUCKET = 'organisation-deletion-certificates'
export const TIME_BUDGET_MS = 100_000
export const STEP_MS = 15_000
export const FILE_CHUNK = 100

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const safeName = (text) => String(text || 'deletion').replace(/[^A-Za-z0-9_-]+/g, '-')

export function certificateEmail(cert, recipient) {
  const org = escapeHtml(cert.organisation)
  return {
    subject: `Deletion certificate for ${cert.organisation}`,
    html: [
      `<p>Hello ${escapeHtml(recipient?.name || '')},</p>`,
      `<p><strong>${org}</strong> and its data were deleted permanently on ${escapeHtml(cert.deleted_on)}, as asked in deletion request ${escapeHtml(cert.request_reference || '')}.</p>`,
      `<p>The deletion certificate (reference <strong>${escapeHtml(cert.reference)}</strong>) is attached. It lists what was deleted and what we keep, and why. Please keep it for your records.</p>`,
    ].join('\n'),
  }
}

export async function handle(payload, ctx, options = {}) {
  const now = options.now || (() => Date.now())
  const budget = options.budget ?? TIME_BUDGET_MS
  const recordId = payload?.record_id
  if (!recordId) return { error: 'record_id is missing from the payload' }
  const started = now()
  const outOfTime = () => now() - started >= budget
  let accountId = null

  const call = async (fn, params) => {
    const res = await ctx.rpc(fn, params)
    if (res?.error) throw new Error(`${fn}: ${res.error.message || res.error}`)
    return res.data
  }
  const context = async () => {
    const info = (await call('organisation_deletion_context', { p_record_id: recordId })) || {}
    if (info.account_id) accountId = info.account_id
    return info
  }
  const continueLater = async (stage) => {
    const next = await ctx.rpc('enqueue_background_job', {
      p_code: 'organisation.deletion_execute',
      p_payload: { record_id: recordId },
      p_run_after: null,
      p_dedupe_key: `orgdel-exec:${recordId}:${stage}-${now()}`,
      p_organisation_id: accountId,
    })
    if (next?.error) return { error: `could not queue the next run: ${next.error.message}` }
    return { processed: 0, continued: true, stage }
  }
  const removeFiles = async (files) => {
    if (typeof ctx.storageRemove !== 'function') throw new Error('The worker adapter has no storageRemove')
    const byBucket = new Map()
    for (const f of files) {
      if (!f?.bucket || !f?.path) continue
      if (!byBucket.has(f.bucket)) byBucket.set(f.bucket, [])
      byBucket.get(f.bucket).push(f.path)
    }
    for (const [bucket, paths] of byBucket) {
      for (let i = 0; i < paths.length; i += FILE_CHUNK) {
        const res = await ctx.storageRemove(bucket, paths.slice(i, i + FILE_CHUNK))
        const message = res?.error ? String(res.error.message || res.error) : ''
        if (message && !/not.?found/i.test(message)) throw new Error(`Storage ${bucket}: ${message}`)
      }
    }
  }

  try {
    let info = await context()
    if (info.skip) return { processed: 0, skipped: info.skip }
    if (info.held) return { processed: 0, paused: 'legal hold' }

    if (info.status === 'deleting') {
      while (Array.isArray(info.next_files) && info.next_files.length) {
        if (outOfTime()) return await continueLater('files')
        await removeFiles(info.next_files)
        await call('organisation_deletion_files_done', { p_record_id: recordId, p_count: info.next_files.length, p_failed: [] })
        info = await context()
        if (info.held) return { processed: 0, paused: 'legal hold' }
      }

      let retries = 0
      for (;;) {
        if (outOfTime()) return await continueLater('rows')
        const step = (await call('organisation_deletion_step', { p_record_id: recordId, p_budget_ms: STEP_MS })) || {}
        if (step.held) return { processed: 0, paused: 'legal hold' }
        if (step.stalled) throw new Error(`The deletion cannot go on: ${JSON.stringify(step.errors || {})}`)
        if (!step.done) continue
        const fin = (await call('organisation_deletion_finish', { p_record_id: recordId })) || {}
        if (!fin.retry) break
        retries += 1
        if (retries > 2) throw new Error(`Rows keep being left in: ${(fin.left || []).join(', ')}`)
      }
      info = await context()
      if (info.skip) return { processed: 1, skipped: info.skip }
    }

    const cert = info.certificate
    if (!cert) return { error: 'The deletion is complete but its certificate data is missing' }
    if (typeof ctx.storageUpload !== 'function') throw new Error('The worker adapter has no storageUpload')
    const bytes = buildCertificatePdf(cert)
    const filename = `deletion-certificate-${safeName(cert.reference)}.pdf`
    const path = `${recordId}/${filename}`
    const up = await ctx.storageUpload(BUCKET, path, bytes, 'application/pdf')
    if (up?.error) throw new Error(`upload ${filename}: ${up.error.message || up.error}`)

    let sent = 0
    const content = toBase64(bytes)
    for (const recipient of Array.isArray(cert.recipients) ? cert.recipients : []) {
      if (!recipient?.email) continue
      const { subject, html } = certificateEmail(cert, recipient)
      const res = await ctx.invokeFunction('send-email', {
        to: recipient.email, subject, html,
        attachments: [{ filename, content, content_type: 'application/pdf' }],
      })
      if (!res?.ok || res.data?.success === false) throw new Error(`send-email ${res?.status}: ${res?.data?.error || 'failed'}`)
      sent += 1
    }
    await call('organisation_deletion_certificate_saved', { p_record_id: recordId, p_path: path, p_sent: sent })
    return { processed: 1, rows_deleted: Number(cert.rows_deleted) || 0, certificate: path, sent }
  } catch (err) {
    const message = String(err?.message || err)
    await ctx.rpc('organisation_deletion_note_error', { p_record_id: recordId, p_error: message })
    return { error: message }
  }
}
