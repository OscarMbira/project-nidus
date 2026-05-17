/**
 * Human-friendly project invitation URLs.
 * Path: /auth/invitation/{projectCode}/{roleSlug}?token=...
 * Legacy path-token URLs remain supported for older emails.
 */

const toSlug = (str) =>
  (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'invite'

/**
 * First URL segment: prefer projects.project_code, else slugified project name.
 * @param {string | null | undefined} projectCode
 * @param {string | null | undefined} projectName
 */
export function invitationProjectSegment(projectCode, projectName) {
  const code = String(projectCode ?? '').trim()
  if (code) return encodeURIComponent(code)
  return encodeURIComponent(toSlug(projectName))
}

/**
 * Second URL segment: slugified role (decorative; validation uses token only).
 */
export function invitationRoleSegment(roleName) {
  return encodeURIComponent(toSlug(roleName))
}

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

  const projectSeg = invitationProjectSegment(projectCode, projectName)
  const roleSeg = invitationRoleSegment(roleName)
  const base = `${origin.replace(/\/$/, '')}/auth/invitation/${projectSeg}/${roleSeg}`
  const tokenQs = `token=${encodeURIComponent(invitationToken)}`
  const acceptUrl = `${base}?${tokenQs}`
  const declineUrl = `${acceptUrl}&action=decline`

  return { acceptUrl, declineUrl }
}

/** @deprecated Use object form — kept for quick migration */
export function buildProjectInvitationUrlsLegacy(projectName, roleName, invitationToken) {
  return buildProjectInvitationUrls({ projectName, roleName, invitationToken })
}
