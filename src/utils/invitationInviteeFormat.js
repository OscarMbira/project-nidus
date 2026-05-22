/**
 * Invitee name helpers for invitation messages and accept/decline UI.
 */

export function formatInviteeFullName(firstName, lastName) {
  const first = String(firstName ?? '').trim()
  const last = String(lastName ?? '').trim()
  return [first, last].filter(Boolean).join(' ')
}

/**
 * Read invitee first/last name from invitation accept payload or DB row.
 * @param {Record<string, unknown>} invitation
 */
export function parseInviteeNamesFromInvitation(invitation = {}) {
  const first =
    invitation.invited_first_name != null
      ? String(invitation.invited_first_name).trim()
      : ''
  const last =
    invitation.invited_last_name != null ? String(invitation.invited_last_name).trim() : ''
  return { first, last, full: formatInviteeFullName(first, last) }
}

/**
 * Extract greeting after "Dear …," from stored invitation message (legacy rows without DB columns).
 * @param {string|null|undefined} message
 * @returns {string} trimmed full name or ''
 */
export function extractDearInviteeNameFromMessage(message) {
  const raw = String(message ?? '').trim()
  if (!raw) return ''
  const m = raw.match(/^\s*Dear\s+([^,\n]+?)\s*,/im)
  return m ? String(m[1]).trim().replace(/\*\*/g, '') : ''
}

/**
 * Split "Given Middle Family" → first = all but last token, last = last token (display heuristic).
 */
export function splitFullNameIntoFirstLast(fullName) {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

/**
 * DB invitee columns plus fallback from personalised message body ("Dear …,").
 * @param {Record<string, unknown>} invitation
 */
export function resolveInviteeNamesForInvitation(invitation = {}) {
  let first =
    invitation.invited_first_name != null ? String(invitation.invited_first_name).trim() : ''
  let last =
    invitation.invited_last_name != null ? String(invitation.invited_last_name).trim() : ''
  let full = formatInviteeFullName(first, last)

  if (!full && invitation.invitation_message) {
    const extracted = extractDearInviteeNameFromMessage(invitation.invitation_message)
    if (extracted) {
      const split = splitFullNameIntoFirstLast(extracted)
      first = split.first
      last = split.last
      full = formatInviteeFullName(first, last)
    }
  }

  return { first, last, full }
}

/** Email local part before @ (lowercase). */
export function emailLocalPart(email) {
  const e = String(email ?? '').trim().toLowerCase()
  const at = e.indexOf('@')
  return at > 0 ? e.slice(0, at) : e
}

/**
 * True when display name is only the email handle (e.g. oscarmbirablogging@gmail.com → oscarmbirablogging).
 * @param {string} name
 * @param {string} email
 */
export function isHandleLikeDisplayName(name, email) {
  const n = String(name ?? '').trim()
  if (!n) return false
  const emailNorm = String(email ?? '').trim().toLowerCase()
  const local = emailLocalPart(email)
  if (!local) return false
  return n.toLowerCase() === local || n.toLowerCase() === emailNorm
}

/**
 * Inviter label from a users row (send email, PMO/PM forms).
 * Prefers first_name + last_name; falls back to auth metadata (OAuth display name) before
 * surrendering to a handle-like full_name.
 * @param {Record<string, unknown>} user  - public.users row
 * @param {string} [fallbackEmail]
 * @param {Record<string, unknown>} [authMeta] - Supabase user_metadata (optional)
 */
export function resolveInviterDisplayNameFromUser(user = {}, fallbackEmail = '', authMeta = {}) {
  const first = String(user.first_name ?? '').trim()
  const last = String(user.last_name ?? '').trim()
  const composed = formatInviteeFullName(first, last)
  const full = String(user.full_name ?? '').trim()
  const email = String(user.email ?? fallbackEmail ?? '').trim()

  // Auth-metadata name: full_name → given+family → name (Google/OAuth fields)
  const metaFirst = String(authMeta.first_name ?? authMeta.given_name ?? '').trim()
  const metaLast = String(authMeta.last_name ?? authMeta.family_name ?? '').trim()
  const metaName = (
    String(authMeta.full_name ?? authMeta.name ?? '').trim() ||
    formatInviteeFullName(metaFirst, metaLast)
  ).trim()

  // 1. DB first + last name (most reliable)
  if (composed) return composed

  // 2. DB full_name when it is a real display name (not an email handle)
  if (full && !isHandleLikeDisplayName(full, email)) return full

  // 3. Auth metadata before giving up to a handle-like DB name
  if (metaName && !isHandleLikeDisplayName(metaName, email)) return metaName

  // 4. Last resort: whatever is stored, even if handle-like
  if (full) return full
  if (metaName) return metaName

  const local = emailLocalPart(email)
  if (local) return local
  if (email) return email
  return ''
}

/**
 * Inviter label for "Sent by" (not the invitee name on the invitation record).
 * @param {Record<string, unknown>} invitation
 */
export function resolveInviterDisplayName(invitation = {}) {
  const fromRpc =
    invitation.inviter_display_name != null
      ? String(invitation.inviter_display_name).trim()
      : ''
  const legacy = invitation.invited_by_name != null ? String(invitation.invited_by_name).trim() : ''
  const email = String(invitation.invited_by_email ?? invitation.inviter_email ?? '').trim()

  if (fromRpc && !isHandleLikeDisplayName(fromRpc, email)) return fromRpc
  if (legacy && !isHandleLikeDisplayName(legacy, email)) return legacy

  const composed = formatInviteeFullName(
    invitation.inviter_first_name ?? invitation.invited_by_first_name,
    invitation.inviter_last_name ?? invitation.invited_by_last_name,
  )
  if (composed) return composed

  if (fromRpc) return fromRpc
  return legacy || 'Your project contact'
}

/**
 * Apply invitee placeholders and optional greeting when sending invitations.
 * @param {string|null|undefined} message
 * @param {{ inviteeFirstName?: string, inviteeLastName?: string }} ctx
 */
export function personalizeInvitationMessage(message, ctx = {}) {
  const first = String(ctx.inviteeFirstName ?? '').trim()
  const last = String(ctx.inviteeLastName ?? '').trim()
  const full = formatInviteeFullName(first, last)
  let body = String(message ?? '')

  if (full) {
    body = body
      .replaceAll('{{invitee_first_name}}', first)
      .replaceAll('{{invitee_last_name}}', last)
      .replaceAll('{{invitee_full_name}}', full)
      .replaceAll('{{invitee_name}}', full)

    const hasPlaceholder = /{{invitee_/i.test(String(message ?? ''))
    const hasGreeting = /^\s*dear\s+/im.test(body)
    const mentionsName = full && body.includes(full)
    if (!hasPlaceholder && !hasGreeting && !mentionsName) {
      body = `Dear ${full},\n\n${body}`.trim()
    }
  }

  return body.trim()
}
