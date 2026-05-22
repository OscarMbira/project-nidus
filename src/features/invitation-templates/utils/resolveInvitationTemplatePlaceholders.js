import { formatInviteeFullName } from '../../../utils/invitationInviteeFormat.js'

const EXPIRY_FALLBACK_DAYS = 7

function clampDisplayExpiryDays(raw) {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return EXPIRY_FALLBACK_DAYS
  return Math.min(365, Math.max(1, n))
}

export function formatInvitationExpiryPeriod(days) {
  const d = clampDisplayExpiryDays(days)
  return d === 1 ? '1 calendar day' : `${d} calendar days`
}

/**
 * Replace template variables for invite preview / pre-fill (client-side).
 * @param {string} body
 * @param {{
 *   projectName?: string,
 *   roleDisplayName?: string,
 *   inviterName?: string,
 *   organisationName?: string,
 *   invitationExpiryDays?: number | string | null | undefined,
 * }} ctx
 */
const PROJECT_PLACEHOLDER_KEYS = [
  'project_code',
  'project_description',
  'project_type',
  'project_methodology',
  'project_start_date',
  'project_end_date',
  'project_timeline',
  'portfolio_code',
  'portfolio_name',
  'programme_code',
  'programme_name',
  'portfolio_context_line',
  'programme_context_line',
  'hierarchy_block',
  'project_context_block',
]

function applyProjectContextPlaceholders(s, ctx, projectContext) {
  if (!projectContext?.placeholderMap) return s
  let out = s
  const map = projectContext.placeholderMap
  for (const key of PROJECT_PLACEHOLDER_KEYS) {
    const token = `{{${key}}}`
    if (map[key] != null && out.includes(token)) {
      out = out.replaceAll(token, map[key])
    }
  }
  if (ctx.projectName?.trim() && map.project_name) {
    out = out.replaceAll('{{project_name}}', map.project_name)
  }
  return out
}

export function resolveInvitationTemplatePlaceholders(body, ctx) {
  if (body == null) return ''
  let s = String(body)
  const pc = ctx.projectContext
  const projectName =
    pc?.placeholderMap?.project_name || ctx.projectName?.trim() || 'this project'
  const roleName = ctx.roleDisplayName?.trim() || 'this role'
  const inviterName = ctx.inviterName?.trim() || 'the project team'
  const organisationName = ctx.organisationName?.trim() || 'our organisation'
  const expiryDays = clampDisplayExpiryDays(ctx.invitationExpiryDays)
  const expiryPeriod = formatInvitationExpiryPeriod(expiryDays)
  const expiryNote = `Please accept within **${expiryDays} days** — this invitation expires **${expiryPeriod}** after it is sent.`

  s = s.replaceAll('{{project_name}}', projectName)
  s = s.replaceAll('{{role_name}}', roleName)
  s = s.replaceAll('{{inviter_name}}', inviterName)
  s = s.replaceAll('{{organisation_name}}', organisationName)
  s = s.replaceAll('{{sender_name}}', inviterName)
  s = s.replaceAll('{{sender_organisation}}', organisationName)
  s = s.replaceAll('{{invitation_expiry_days}}', String(expiryDays))
  s = s.replaceAll('{{invitation_expiry_period}}', expiryPeriod)
  s = s.replaceAll('{{invitation_expiry_note}}', expiryNote)

  const inviteeFirst = ctx.inviteeFirstName?.trim() || ''
  const inviteeLast = ctx.inviteeLastName?.trim() || ''
  const inviteeFull = formatInviteeFullName(inviteeFirst, inviteeLast)
  const inviteeGreeting = inviteeFull || 'colleague'
  s = s.replaceAll('{{invitee_first_name}}', inviteeFirst)
  s = s.replaceAll('{{invitee_last_name}}', inviteeLast)
  s = s.replaceAll('{{invitee_full_name}}', inviteeFull)
  s = s.replaceAll('{{invitee_name}}', inviteeGreeting)

  s = applyProjectContextPlaceholders(s, ctx, pc)
  return s
}
