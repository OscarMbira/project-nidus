/**
 * HTML / plain blocks for invitation project context (v576).
 */

import { escapeHtml } from './invitationMessageEmailFormat'

function renderLabelValueHtml(label, value) {
  if (!value) return ''
  return `<tr>
    <td style="padding:4px 0;color:#6b7280;font-size:13px;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;color:#111827;font-size:13px;line-height:1.5;">${escapeHtml(value)}</td>
  </tr>`
}

/**
 * @param {object|null} ctx — from loadInvitationProjectContext
 */
export function formatProjectContextBlockHtml(ctx) {
  if (!ctx) return ''

  const rows = []
  if (ctx.projectDescription) {
    rows.push(renderLabelValueHtml('Description', ctx.projectDescription))
  }
  rows.push(renderLabelValueHtml('Type', ctx.projectType || 'Not specified'))
  rows.push(renderLabelValueHtml('Methodology', ctx.projectMethodology || 'Not specified'))
  rows.push(renderLabelValueHtml('Timeline', ctx.timeline || 'Dates not set'))

  const hierarchyRows = [ctx.portfolio?.line, ctx.programme?.line, ctx.projectLine]
    .filter(Boolean)
    .map(
      (line) =>
        `<li style="margin:0 0 6px;color:#374151;font-size:13px;line-height:1.5;">${escapeHtml(line)}</li>`,
    )
    .join('')

  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:24px 0;">
    <p style="margin:0 0 12px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Project context</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      ${rows.join('')}
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Hierarchy</p>
    <ul style="margin:0;padding-left:18px;">${hierarchyRows}</ul>
  </div>`
}

export function formatProjectContextBlockPlain(ctx) {
  return ctx?.projectContextBlockPlain || ''
}
