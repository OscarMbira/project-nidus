/**
 * Clean token-based invitation URLs.
 * New format : /i/{token}          (used in outgoing emails)
 * Legacy      : /auth/invitation/{projectCode}/{roleSlug}?token=...
 *               Both routes still resolve to InvitationAccept for old emails.
 */

/**
 * @param {{
 *   projectCode?: string | null,
 *   projectName?: string | null,
 *   roleName?: string | null,
 *   invitationToken?: string | null,
 *   origin?: string,
 * }} params
 */
export function buildProjectInvitationUrls({
  projectCode = null,
  projectName = 'a project',
  roleName = 'team member',
  invitationToken = null,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
}) {
  if (!invitationToken || !origin) {
    return { acceptUrl: null, declineUrl: null }
  }

  const base = `${origin.replace(/\/$/, '')}/i/${encodeURIComponent(invitationToken)}`
  const acceptUrl = base
  const declineUrl = `${base}?action=decline`

  return { acceptUrl, declineUrl }
}

// ── Helpers kept for any internal callers ──────────────────────────────────

const toSlug = (str) =>
  (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'invite'

export function invitationProjectSegment(projectCode, projectName) {
  const code = String(projectCode ?? '').trim()
  if (code) return encodeURIComponent(code)
  return encodeURIComponent(toSlug(projectName))
}

export function invitationRoleSegment(roleName) {
  return encodeURIComponent(toSlug(roleName))
}

/** @deprecated Use object form — kept for quick migration */
export function buildProjectInvitationUrlsLegacy(projectName, roleName, invitationToken) {
  return buildProjectInvitationUrls({ projectName, roleName, invitationToken })
}
