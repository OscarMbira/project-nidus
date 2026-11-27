/**
 * v1352 Slice 1 (1.1) — handler for catalogue job `reports.health_send`: one scheduled health report run.
 * Queued by public.run_due_health_reports (schedule) and by scheduled_health_report_run_now (Run now, both
 * apps) with { schema, run_id }. Builds the report (public.scheduled_report_build), emails every recipient
 * through send-email and records the result on the run (public.scheduled_report_finish).
 * A run with no recipients fails at once (no retry); when no email could be sent the item is retried.
 * Slice 2: when some copies were sent and others failed, the failed ones go to the email outbox (email.send).
 */
import { buildHealthReportEmail } from '../email.js'

export async function handle(payload, ctx) {
  const { schema, run_id: runId } = payload || {}
  if (!['public', 'sim'].includes(schema) || !runId) return { error: 'Report item needs schema and run_id' }

  const built = await ctx.rpc('scheduled_report_build', { p_schema: schema, p_run_id: runId })
  if (built.error) return { error: `scheduled_report_build: ${built.error.message}` }
  const data = built.data || {}

  const finish = async (ok, error, sent) => {
    const res = await ctx.rpc('scheduled_report_finish', {
      p_schema: schema, p_run_id: runId, p_ok: ok, p_error: error || null, p_sent: sent,
    })
    if (res.error) throw new Error(`scheduled_report_finish: ${res.error.message}`)
  }

  const recipients = Array.isArray(data.recipients) ? data.recipients.filter(Boolean) : []
  if (recipients.length === 0) {
    await finish(false, 'No recipients: add an email address to the schedule.', 0)
    return { processed: 0, skipped: 'no recipients' }
  }

  const { subject, html } = buildHealthReportEmail(data)
  let sent = 0
  const failed = []
  const failedTo = new Map()
  for (const to of recipients) {
    const res = await ctx.invokeFunction('send-email', { to, subject, html })
    if (res.ok && res.data?.success !== false) sent += 1
    else {
      const entry = `${to} (${res.status}${res.data?.error ? `: ${res.data.error}` : ''})`
      failed.push(entry)
      failedTo.set(entry, to)
    }
  }

  if (sent === 0) {
    await finish(false, `Not sent: ${failed.join('; ')}`, 0)
    return { error: `No report email could be sent: ${failed[0]}` }
  }

  // v1352 Slice 2 (2.1): a recipient whose copy failed while others were sent goes to the email outbox,
  // which retries with back-off — the whole report is not sent again to everyone.
  let queued = 0
  for (const entry of failed) {
    const to = failedTo.get(entry)
    const res = await ctx.rpc('queue_email', {
      p_to: to, p_subject: subject, p_html: html, p_dedupe_key: `report:${runId}:${to}`,
    })
    if (res.error) ctx.log?.(`[reports.health_send] could not queue a retry for ${to}: ${res.error.message}`)
    else queued += 1
  }
  const note = failed.length
    ? `Not sent to: ${failed.join('; ')}${queued ? ` (${queued} queued for retry)` : ''}`
    : null
  await finish(true, note, sent)
  return { processed: sent, failed: failed.length, retry_queued: queued, practice: Boolean(data.practice) }
}
