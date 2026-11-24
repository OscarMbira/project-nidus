/**
 * v1352 Slice 1 — email bodies for background jobs (host-neutral, pure functions; unit tested).
 *   buildHealthReportEmail(data)  scheduled health report (reports.health_send), data from scheduled_report_build
 *   buildDigestEmail(payload)     daily digest (notifications.digest_send), payload from run_daily_digest
 * Practice (Simulator) content is always marked as practice (PRD D8). Dates arrive already formatted in
 * the organisation's date format (rule 68); nothing here formats dates.
 */

export const PRACTICE_LABEL = 'Simulator practice'

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatAmount(value, currency) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? `${currency} ${n}` : n
}

/** SPI / CPI from a snapshot { planned_value, earned_value, actual_cost }; null when not computable. */
export function evmIndices(evm) {
  if (!evm) return { spi: null, cpi: null }
  const pv = Number(evm.planned_value) || 0
  const ev = Number(evm.earned_value) || 0
  const ac = Number(evm.actual_cost) || 0
  return {
    spi: pv ? Math.round((ev / pv) * 100) / 100 : null,
    cpi: ac ? Math.round((ev / ac) * 100) / 100 : null,
  }
}

const row = (label, value) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(label)}</td><td style="padding:4px 0"><strong>${escapeHtml(value ?? '—')}</strong></td></tr>`

const practiceBanner = () =>
  `<p style="background:#fff7e6;border:1px solid #f0c36d;padding:8px 12px;border-radius:6px">${PRACTICE_LABEL}: this report comes from a practice project in the Simulator, not a live project.</p>`

export function buildHealthReportEmail(data = {}) {
  const project = data.project || {}
  const counts = data.counts || {}
  const name = project.name || data.schedule_name || 'Project'
  const prefix = data.practice ? `[${PRACTICE_LABEL}] ` : ''
  const subject = `${prefix}Project health report: ${name}${data.report_date ? ` (${data.report_date})` : ''}`
  const { spi, cpi } = evmIndices(data.evm)
  const milestones = Array.isArray(data.milestones) ? data.milestones : []
  const percent = project.percent_complete === null || project.percent_complete === undefined ? null : `${Number(project.percent_complete)}%`

  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:640px">',
    data.practice ? practiceBanner() : '',
    `<h2 style="margin:0 0 4px">${escapeHtml(name)}${project.code ? ` <span style="color:#777;font-weight:normal">(${escapeHtml(project.code)})</span>` : ''}</h2>`,
    `<p style="margin:0 0 16px;color:#555">${escapeHtml(data.schedule_name || 'Scheduled health report')}${data.report_date ? ` · ${escapeHtml(data.report_date)}` : ''}</p>`,
    '<table style="border-collapse:collapse">',
    row('Status', project.status),
    row('Health', project.health ? String(project.health).toUpperCase() : null),
    row('Complete', percent),
    row('Planned start', project.planned_start),
    row('Planned finish', project.planned_end),
    row('Budget', formatAmount(project.budget, project.currency)),
    row('Actual cost to date', formatAmount(counts.actual_cost, project.currency)),
    row('Open risks', counts.open_risks),
    row('Open issues', counts.open_issues),
    row('Overdue tasks', counts.overdue_tasks),
    row('Overdue milestones', counts.overdue_milestones),
    data.evm ? row('Schedule performance (SPI)', spi) : '',
    data.evm ? row('Cost performance (CPI)', cpi) : '',
    '</table>',
    milestones.length
      ? `<h3 style="margin:16px 0 4px">Milestones in the next 30 days</h3><ul>${milestones
        .map((m) => `<li>${escapeHtml(m.name)} — ${escapeHtml(m.date)}</li>`)
        .join('')}</ul>`
      : '',
    '<p style="color:#777;font-size:12px;margin-top:24px">You receive this because you are listed on this scheduled report. The schedule owner can change the recipients.</p>',
    '</div>',
  ].join('')
  return { subject, html }
}

export function buildDigestEmail(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const live = items.filter((i) => !i.practice)
  const practice = items.filter((i) => i.practice)
  const onlyPractice = live.length === 0 && practice.length > 0
  const subject = `${onlyPractice ? `[${PRACTICE_LABEL}] ` : ''}Your daily summary${payload.date_label ? ` for ${payload.date_label}` : ''}: ${items.length} new ${items.length === 1 ? 'notice' : 'notices'}`

  const list = (rows) => `<ul style="padding-left:18px">${rows
    .map((i) => `<li style="margin-bottom:8px"><strong>${escapeHtml(i.title)}</strong><br><span style="color:#555">${escapeHtml(i.message)}</span></li>`)
    .join('')}</ul>`

  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:640px">',
    `<p>Hello${payload.name ? ` ${escapeHtml(payload.name)}` : ''},</p>`,
    '<p>Here is what came in for you today.</p>',
    live.length ? `<h3 style="margin:16px 0 4px">Your projects</h3>${list(live)}` : '',
    practice.length ? `<h3 style="margin:16px 0 4px">${PRACTICE_LABEL}</h3><p style="color:#777;margin:0">Practice projects in the Simulator, not live work.</p>${list(practice)}` : '',
    '<p style="color:#777;font-size:12px;margin-top:24px">You get one summary a day. To stop it, switch off email for Reports &amp; Digests in Notification Preferences. Reminders still show in the app.</p>',
    '</div>',
  ].join('')
  return { subject, html }
}
