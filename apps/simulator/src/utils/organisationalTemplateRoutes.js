/**
 * Resolve list/detail base paths for Organisational / Project Templates so PM and PMO
 * stays on their own role-scoped URL (never cross into /app/pmo/... from a PM view).
 *
 * Federated modules alias @nidus/shared/utils → apps shell utils — keep copies there in sync.
 */

export function resolveOrgTemplatesListBase(pathname = '', { listVariant = 'organisational' } = {}) {
  const path = String(pathname || '')
  const isSim = path.startsWith('/simulator')

  if (listVariant === 'project') {
    return isSim ? '/simulator/pm/templates/project' : '/platform/templates/project'
  }

  // Project Documents register (v849) — fill-in detail under /documents/project/:nodeId
  if (path.includes('/platform/documents/project') || path.includes('/simulator/pm/documents/project')) {
    return isSim ? '/simulator/pm/documents/project' : '/platform/documents/project'
  }

  if (path.includes('/platform/templates/project') || path.includes('/simulator/pm/templates/project')) {
    return isSim ? '/simulator/pm/templates/project' : '/platform/templates/project'
  }
  if (
    path.includes('/platform/templates/organisational') ||
    path.includes('/simulator/pm/templates/organisational') ||
    path.includes('/platform/templates') ||
    path.includes('/simulator/pm/templates')
  ) {
    return isSim ? '/simulator/pm/templates/organisational' : '/platform/templates/organisational'
  }
  if (path.includes('/simulator/pmo/organisational-templates')) {
    return '/simulator/pmo/organisational-templates'
  }
  return '/app/pmo/organisational-templates'
}

/** Strip a trailing /:nodeId (uuid or display id) to get the list base from a detail URL. */
export function resolveOrgTemplatesListBaseFromDetailPath(pathname = '') {
  const path = String(pathname || '').replace(/\/+$/, '')
  const stripped = path.replace(/\/[^/]+$/, '')
  if (
    /\/(organisational-templates|templates\/organisational|templates\/project|documents\/project)$/.test(
      stripped,
    )
  ) {
    return stripped
  }
  return resolveOrgTemplatesListBase(pathname)
}

export function orgTemplateDetailPath(listBase, nodeIdOrReference) {
  const base = String(listBase || '').replace(/\/+$/, '')
  const id = encodeURIComponent(String(nodeIdOrReference || '').trim())
  return `${base}/${id}`
}

/**
 * "Manage form fields →" must stay on the viewer's role-scoped surface.
 * PM Project Templates → project field-policy page (TierFormPolicyPanel),
 *   except blank-origin local forms (parent_node_id IS NULL / isBlankOrigin) which
 *   need the full Form Template Builder to author schema (v852 D5).
 * PM Organisational Templates → Form Template Builder under /platform|simulator/pm (not /app/pmo).
 * PMO → existing /app/pmo/forms (or simulator/pmo/forms) builder.
 */
export function resolveFormTemplateManagePath(
  pathname = '',
  { templateCode, scopeEntityId, tier, isBlankOrigin = false } = {},
) {
  const path = String(pathname || '')
  const code = String(templateCode || '').trim()
  if (!code) return null

  const encoded = encodeURIComponent(code)
  const isSim = path.startsWith('/simulator')
  const onPmTemplates =
    path.includes('/platform/templates/') || path.includes('/simulator/pm/templates/')
  const projectId = scopeEntityId ? String(scopeEntityId) : ''
  const isProjectContext =
    tier === 'project' ||
    /\/templates\/project(\/|$)/.test(path)

  // Blank-origin project forms author schema in the full builder, not TierFormPolicyPanel.
  if (onPmTemplates && isProjectContext && projectId && !isBlankOrigin) {
    const q = `?templateCode=${encoded}`
    return isSim
      ? `/simulator/pm/projects/${projectId}/field-templates${q}`
      : `/platform/projects/${projectId}/field-templates${q}`
  }

  if (onPmTemplates) {
    return isSim
      ? `/simulator/pm/templates/forms/${encoded}/edit`
      : `/platform/templates/forms/${encoded}/edit`
  }

  if (path.includes('/simulator/pmo/')) {
    return `/simulator/pmo/forms/${encoded}/edit`
  }
  return `/app/pmo/forms/${encoded}/edit`
}
