/**
 * Resolve list/detail base paths for Organisational / Project Templates so PM and PMO
 * stays on their own role-scoped URL (never cross into /app/pmo/... from a PM view).
 *
 * Federated modules alias @nidus/shared/utils → apps shell utils — keep copies there in sync.
 *
 * v864: project-scoped PM lists/details use /templates/{project|organisational}/<projectKey>[/<templateRef>]
 */

/**
 * Parse PM template list/detail paths (platform + simulator/pm).
 * @returns {{ kind: 'project'|'organisational'|null, projectKey: string|null, nodeId: string|null, ambiguousSegment: string|null }}
 */
export function parsePmTemplatesPath(pathname = '') {
  const path = String(pathname || '').replace(/\/+$/, '')
  const m = path.match(
    /\/(?:platform|simulator\/pm)\/templates\/(project|organisational)(?:\/([^/]+))?(?:\/([^/]+))?$/i,
  )
  if (!m) {
    return { kind: null, projectKey: null, nodeId: null, ambiguousSegment: null }
  }
  const kind = m[1].toLowerCase()
  const a = m[2] ? safeDecode(m[2]) : null
  const b = m[3] ? safeDecode(m[3]) : null
  if (kind === 'project') {
    if (b) return { kind, projectKey: a, nodeId: b, ambiguousSegment: null }
    if (a) return { kind, projectKey: a, nodeId: null, ambiguousSegment: a }
    return { kind, projectKey: null, nodeId: null, ambiguousSegment: null }
  }
  // organisational: two segments = projectKey + node; one segment is ambiguous
  if (b) return { kind, projectKey: a, nodeId: b, ambiguousSegment: null }
  if (a) return { kind, projectKey: null, nodeId: null, ambiguousSegment: a }
  return { kind, projectKey: null, nodeId: null, ambiguousSegment: null }
}

function safeDecode(raw) {
  try {
    return decodeURIComponent(String(raw || '').trim())
  } catch {
    return String(raw || '').trim()
  }
}

/** Strip legacy entity query keys used before v864 path-based project keys. */
export function stripLegacyTemplateEntityParams(searchParams) {
  const qs = new URLSearchParams(
    searchParams instanceof URLSearchParams
      ? searchParams
      : String(searchParams || ''),
  )
  qs.delete('entityType')
  qs.delete('entityId')
  qs.delete('projectId')
  return qs
}

/**
 * Build PM templates list href with optional project key and filters.
 * @param {{ pathname?: string, listVariant?: 'project'|'organisational', projectKey?: string, searchParams?: URLSearchParams|string }} opts
 */
export function buildPmTemplatesListPath({
  pathname = '',
  listVariant = 'organisational',
  projectKey = '',
  searchParams,
} = {}) {
  const isSim = String(pathname || '').startsWith('/simulator')
  const root =
    listVariant === 'project'
      ? isSim
        ? '/simulator/pm/templates/project'
        : '/platform/templates/project'
      : isSim
        ? '/simulator/pm/templates/organisational'
        : '/platform/templates/organisational'
  const key = String(projectKey || '').trim()
  const path = key ? `${root}/${encodeURIComponent(key)}` : root
  const qs = stripLegacyTemplateEntityParams(searchParams)
  const q = qs.toString()
  return q ? `${path}?${q}` : path
}

export function resolveOrgTemplatesListBase(pathname = '', { listVariant = 'organisational', projectKey } = {}) {
  const path = String(pathname || '')
  const isSim = path.startsWith('/simulator')
  const parsed = parsePmTemplatesPath(path)

  let base
  if (listVariant === 'project' || parsed.kind === 'project' || path.includes('/templates/project')) {
    base = isSim ? '/simulator/pm/templates/project' : '/platform/templates/project'
  } else if (path.includes('/platform/documents/project') || path.includes('/simulator/pm/documents/project')) {
    // Project Documents register (v849) — fill-in detail under /documents/project/:nodeId
    base = isSim ? '/simulator/pm/documents/project' : '/platform/documents/project'
  } else if (
    path.includes('/platform/templates/organisational') ||
    path.includes('/simulator/pm/templates/organisational') ||
    path.includes('/platform/templates') ||
    path.includes('/simulator/pm/templates')
  ) {
    base = isSim ? '/simulator/pm/templates/organisational' : '/platform/templates/organisational'
  } else if (path.includes('/simulator/pmo/organisational-templates')) {
    base = '/simulator/pmo/organisational-templates'
  } else {
    base = '/app/pmo/organisational-templates'
  }

  // Attach project key for PM project / project-scoped organisational mounts only.
  const key =
    String(projectKey || '').trim() ||
    parsed.projectKey ||
    (parsed.kind === 'project' ? parsed.ambiguousSegment : null) ||
    ''
  if (
    key &&
    (base.endsWith('/templates/project') ||
      (base.endsWith('/templates/organisational') && (projectKey || parsed.projectKey)))
  ) {
    return `${base}/${encodeURIComponent(key)}`
  }
  return base
}

/** Strip a trailing /:nodeId (uuid or display id) to get the list base from a detail URL. */
export function resolveOrgTemplatesListBaseFromDetailPath(pathname = '') {
  const path = String(pathname || '').replace(/\/+$/, '')
  const parsed = parsePmTemplatesPath(path)
  if (parsed.kind && parsed.projectKey && parsed.nodeId) {
    const isSim = path.startsWith('/simulator')
    const root =
      parsed.kind === 'project'
        ? isSim
          ? '/simulator/pm/templates/project'
          : '/platform/templates/project'
        : isSim
          ? '/simulator/pm/templates/organisational'
          : '/platform/templates/organisational'
    return `${root}/${encodeURIComponent(parsed.projectKey)}`
  }
  const stripped = path.replace(/\/[^/]+$/, '')
  if (
    /\/(organisational-templates|templates\/organisational|templates\/project|documents\/project)$/.test(
      stripped,
    )
  ) {
    return stripped
  }
  // Single-segment project list (/templates/project/:key) — already the list base
  if (parsed.kind === 'project' && parsed.projectKey && !parsed.nodeId) {
    return path
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
  { templateCode, scopeEntityId, scopeEntityType, tier, isBlankOrigin = false } = {},
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
    return appendFormTemplateReturnQuery(
      isSim
        ? `/simulator/pm/templates/forms/${encoded}/edit`
        : `/platform/templates/forms/${encoded}/edit`,
      { tier, scopeEntityId, scopeEntityType },
    )
  }

  if (path.includes('/simulator/pmo/')) {
    return appendFormTemplateReturnQuery(`/simulator/pmo/forms/${encoded}/edit`, {
      tier,
      scopeEntityId,
      scopeEntityType,
    })
  }
  return appendFormTemplateReturnQuery(`/app/pmo/forms/${encoded}/edit`, {
    tier,
    scopeEntityId,
    scopeEntityType,
  })
}

/** Map pm_template_nodes.tier → entityType query used on templates list pages. */
export function entityTypeFromTemplateTier(tier = '') {
  const t = String(tier || '').toLowerCase()
  if (t === 'project') return 'project'
  if (t === 'programme') return 'programme'
  if (t === 'portfolio' || t === 'sub_portfolio') return t
  return ''
}

/** Carry tier/entity context on Form Template Builder URLs for Back navigation. */
export function appendFormTemplateReturnQuery(
  path,
  { tier, scopeEntityId, scopeEntityType } = {},
) {
  const base = String(path || '')
  if (!base) return base
  const qs = new URLSearchParams(base.includes('?') ? base.split('?')[1] : '')
  const pathOnly = base.split('?')[0]
  const t = String(tier || '').trim()
  if (t) qs.set('tier', t)
  const et = String(scopeEntityType || entityTypeFromTemplateTier(t) || '').trim()
  if (et && et !== 'account') qs.set('entityType', et)
  const eid = scopeEntityId != null && String(scopeEntityId).trim() !== ''
    ? String(scopeEntityId).trim()
    : ''
  if (eid) qs.set('entityId', eid)
  const q = qs.toString()
  return q ? `${pathOnly}?${q}` : pathOnly
}

function organisationalFormsListBase(pathname = '', mode = 'platform') {
  const path = String(pathname || '')
  const isSim = path.startsWith('/simulator') || mode === 'sim'
  if (
    path.includes('/platform/templates/')
    || path.includes('/simulator/pm/templates/')
  ) {
    return isSim ? '/simulator/pm/templates/organisational' : '/platform/templates/organisational'
  }
  if (isSim || path.includes('/simulator/pmo/')) {
    return '/simulator/pmo/organisational-templates'
  }
  if (path.includes('/app/pmo/') || path.includes('/pmo/forms') || /^\/pmo(\/|$)/.test(path)) {
    return '/app/pmo/organisational-templates'
  }
  return isSim ? '/simulator/pm/templates/organisational' : '/platform/templates/organisational'
}

/**
 * List page for Form Template Builder "Back to templates" / Cancel.
 * Routes by form tier: PMO → Organisational, portfolio/programme → entity-scoped
 * Organisational list, project → Project Templates. Never /pmo/forms for PM surfaces
 * (RoleScopeGate → /pm/dashboard).
 *
 * @param {string} pathname
 * @param {string} [mode]
 * @param {{ tier?: string, entityType?: string, entityId?: string, scopeEntityType?: string, scopeEntityId?: string }} [ctx]
 */
export function resolveFormTemplateBuilderListPath(pathname = '', mode = 'platform', ctx = {}) {
  const path = String(pathname || '')
  const isSim = path.startsWith('/simulator') || mode === 'sim'
  const tier = String(ctx.tier || '').toLowerCase()
  const entityType = String(ctx.entityType || ctx.scopeEntityType || entityTypeFromTemplateTier(tier) || '').toLowerCase()
  const entityId = String(ctx.entityId || ctx.scopeEntityId || '').trim()

  const qs = new URLSearchParams()
  qs.set('domainGroup', 'forms')

  const isProject =
    tier === 'project'
    || entityType === 'project'
    || path.includes('/templates/project')

  if (isProject) {
    const base = isSim ? '/simulator/pm/templates/project' : '/platform/templates/project'
    if (entityId) {
      return `${base}/${encodeURIComponent(entityId)}?${qs.toString()}`
    }
    return `${base}?${qs.toString()}`
  }

  const orgBase = organisationalFormsListBase(path, mode)

  if (
    tier === 'portfolio'
    || tier === 'sub_portfolio'
    || entityType === 'portfolio'
    || entityType === 'sub_portfolio'
  ) {
    const et = entityType === 'sub_portfolio' || tier === 'sub_portfolio' ? 'sub_portfolio' : 'portfolio'
    qs.set('tier', et)
    if (entityId) {
      qs.set('entityType', et)
      qs.set('entityId', entityId)
    }
    return `${orgBase}?${qs.toString()}`
  }

  if (tier === 'programme' || entityType === 'programme') {
    qs.set('tier', 'programme')
    if (entityId) {
      qs.set('entityType', 'programme')
      qs.set('entityId', entityId)
    }
    return `${orgBase}?${qs.toString()}`
  }

  // PMO / account-tier (and unknown) → Organisational Templates Forms
  return `${orgBase}?${qs.toString()}`
}

/**
 * Map form templates that mirror native registers (Risk Register, Issue Register, …)
 * away from form_instances — those live in dedicated tables/pages.
 */
export function inferNativeRegisterKey({ category, templateName, templateCode } = {}) {
  const cat = String(category || '').trim().toLowerCase()
  if (cat === 'risk_register' || cat === 'risks') return 'risk_register'
  if (cat === 'issue_register' || cat === 'issues') return 'issue_register'
  if (cat === 'lessons_log' || cat === 'lessons') return 'lessons_log'
  if (cat === 'quality_register' || cat === 'quality') return 'quality_register'
  if (cat === 'stakeholder_register' || cat === 'stakeholders') return 'stakeholder_register'
  if (cat === 'change_log' || cat === 'change_register') return 'change_log'

  const name = String(templateName || '')
    .toLowerCase()
    .replace(/\s*\(custom\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (/\brisk\s*register\b/.test(name)) return 'risk_register'
  if (/\bissue\s*register\b/.test(name)) return 'issue_register'
  if (/\blessons?\s*log\b/.test(name)) return 'lessons_log'
  if (/\bquality\s*register\b/.test(name)) return 'quality_register'
  if (/\bstakeholder\s*register\b/.test(name)) return 'stakeholder_register'
  if (/\bchange\s*(log|register)\b/.test(name)) return 'change_log'

  const code = String(templateCode || '').trim().toUpperCase()
  if (/RREG|RISK.?REG/.test(code)) return 'risk_register'
  if (/ISSREG|ISSUE.?REG/.test(code)) return 'issue_register'
  if (/LLOG|LESSON/.test(code)) return 'lessons_log'
  if (/QREG|QUALITY.?REG/.test(code)) return 'quality_register'

  return null
}

/** Count source for a native register (null → skip count / show link only). */
export function nativeRegisterCountSpec(registerKey) {
  switch (registerKey) {
    case 'risk_register':
      return { table: 'risks', projectColumn: 'project_id', softDeleteColumn: 'is_deleted' }
    case 'issue_register':
      return { table: 'issues', projectColumn: 'project_id', softDeleteColumn: 'is_deleted' }
    case 'lessons_log':
      return { table: 'lessons_logs', projectColumn: 'project_id', softDeleteColumn: 'is_deleted' }
    case 'stakeholder_register':
      return { table: 'stakeholders', projectColumn: 'project_id', softDeleteColumn: 'is_deleted' }
    default:
      return null
  }
}

function nativeRegisterPath(registerKey, { pathname = '', projectId = '', projectKey = '' } = {}) {
  const path = String(pathname || '')
  const isSim = path.startsWith('/simulator')
  const pid = String(projectKey || projectId || '').trim()
  const enc = pid ? encodeURIComponent(pid) : ''

  if (registerKey === 'risk_register') {
    if (isSim) return '/simulator/pm/controls/risk-register'
    if (enc) return `/platform/projects/${enc}/risks`
    return '/platform/risks'
  }
  if (registerKey === 'issue_register') {
    if (isSim) return '/simulator/pm/controls/issue-register'
    if (enc) return `/platform/projects/${enc}/issues`
    return '/platform/issues'
  }
  if (registerKey === 'lessons_log') {
    if (isSim) return '/simulator/pm/controls/lessons-log'
    if (enc) return `/platform/projects/${enc}/lessons`
    return '/pm/controls/lessons-log'
  }
  if (registerKey === 'quality_register') {
    if (isSim) return '/simulator/pm/controls/quality-register'
    return '/platform/quality'
  }
  if (registerKey === 'stakeholder_register') {
    if (isSim) return '/simulator/pm/controls/stakeholder-register'
    return '/platform/stakeholders/register'
  }
  if (registerKey === 'change_log') {
    if (isSim) return '/simulator/pmo/registers/changes'
    return '/platform/change-log'
  }
  return null
}

/**
 * Friendly project segment from a PM templates URL when unambiguous.
 * Detail `/project/<projectKey>/<templateRef>` → projectKey.
 * List `/project/<projectKey>` → projectKey unless it looks like a template ref
 * (legacy single-segment detail bookmarks).
 */
function projectKeyFromTemplatesPath(pathname = '') {
  const parsed = parsePmTemplatesPath(pathname)
  if (!parsed.kind) return null
  if (parsed.projectKey && parsed.nodeId) return parsed.projectKey
  if (parsed.kind === 'project' && parsed.projectKey && !parsed.nodeId) {
    const key = String(parsed.projectKey).trim()
    // Legacy …/project/<templateRef> without a project segment
    if (/^(TPL|FT|FS|FA|FRM|F\d)/i.test(key)) return null
    return key || null
  }
  return null
}

/**
 * Records destination for a form template:
 * - Native registers (Risk/Issue/…) → dedicated register UI + table
 * - Otherwise → Project Forms gallery filtered by templateCode
 *
 * @returns {{ path: string|null, kind: 'native'|'forms', registerKey: string|null, countSpec: object|null }}
 */
export function resolveFormTemplateRecordsTarget(
  pathname = '',
  {
    projectId,
    projectKey,
    templateCode,
    category,
    templateName,
  } = {},
) {
  const path = String(pathname || '')
  // Prefer explicit projectKey, then friendly key from templates URL, then UUID.
  const pathKey = String(
    projectKey || projectKeyFromTemplatesPath(path) || projectId || '',
  ).trim()

  const registerKey = inferNativeRegisterKey({ category, templateName, templateCode })
  if (registerKey) {
    const nativePath = nativeRegisterPath(registerKey, {
      pathname,
      projectId,
      projectKey: pathKey,
    })
    return {
      path: nativePath,
      kind: 'native',
      registerKey,
      countSpec: nativeRegisterCountSpec(registerKey),
    }
  }

  const code = String(templateCode || '').trim()
  if (!pathKey) {
    return { path: null, kind: 'forms', registerKey: null, countSpec: null }
  }

  const isSim = path.startsWith('/simulator')
  const qs = new URLSearchParams()
  if (code) qs.set('templateCode', code)
  const q = qs.toString()
  const suffix = q ? `?${q}` : ''
  let formsPath
  if (isSim || path.includes('/simulator/')) {
    formsPath = `/simulator/pm/projects/${encodeURIComponent(pathKey)}/forms${suffix}`
  } else if (path.includes('/pm/projects/') || path.startsWith('/pm/')) {
    formsPath = `/pm/projects/${encodeURIComponent(pathKey)}/forms${suffix}`
  } else {
    formsPath = `/platform/projects/${encodeURIComponent(pathKey)}/forms${suffix}`
  }
  return { path: formsPath, kind: 'forms', registerKey: null, countSpec: null }
}

/**
 * Project Forms register for instances of a form template — or native register when applicable.
 * Prefer resolveFormTemplateRecordsTarget when you also need kind/countSpec.
 */
export function resolveFormTemplateRecordsPath(
  pathname = '',
  { projectId, projectKey, templateCode, category, templateName } = {},
) {
  return resolveFormTemplateRecordsTarget(pathname, {
    projectId,
    projectKey,
    templateCode,
    category,
    templateName,
  }).path
}

/** Base path for /:templateCode/edit under the same role surface as the current builder URL. */
export function resolveFormTemplateBuilderBasePath(pathname = '', mode = 'platform') {
  const path = String(pathname || '')
  if (path.includes('/simulator/pm/templates/')) {
    return '/simulator/pm/templates/forms'
  }
  if (path.includes('/platform/templates/')) {
    return '/platform/templates/forms'
  }
  if (mode === 'sim' || path.includes('/simulator/pmo/')) {
    return '/simulator/pmo/forms'
  }
  if (path.includes('/app/pmo/')) {
    return '/app/pmo/forms'
  }
  return '/pmo/forms'
}
