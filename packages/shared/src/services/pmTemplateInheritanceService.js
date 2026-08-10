/**
 * PM Template Hierarchy — inheritance resolver (Phase 0 / v764).
 *
 * Walks pm_template_nodes via parent_node_id and merges pm_template_field_links
 * tier-by-tier (child overrides parent). Same enable/required/default/label
 * cascade spirit as formTemplateFieldOverrides.js.
 *
 * Pass platformDb or simDb as `db` so Platform and Simulator share one engine.
 */

export const PM_TEMPLATE_DOMAINS = Object.freeze([
  'fields',
  'form_template',
  'industry_plan',
  'opa',
  'process_template',
  'legacy_document',
  'structured_list',
  'portfolio_template',
  'programme_template',
  'project_template',
])

// Domains where an account's own customisation should win over the Global
// master when no explicit entity assignment exists (v807 Gap 2/3) — the org
// copy is what downstream Portfolio/Programme/Project tiers should default
// to once it exists. Deliberately NOT applied to fields/industry_plan/opa/
// form_template/process_template — v805 left those resolving global-first
// on purpose and nothing here revisits that call.
const ACCOUNT_PREFERRED_DOMAINS = new Set(['portfolio_template', 'programme_template', 'project_template'])

export const PM_TEMPLATE_ENTITY_TYPES = Object.freeze([
  'portfolio',
  'sub_portfolio',
  'programme',
  'project',
])

const MAX_CHAIN_DEPTH = 32

/**
 * Walk parent_node_id from start → root. Returns [root, …, leaf].
 * @param {Map<string, object>|Record<string, object>} nodesById
 * @param {string|null|undefined} startNodeId
 * @returns {object[]}
 */
export function buildNodeChainRootToLeaf(nodesById, startNodeId) {
  if (!startNodeId) return []
  const get = typeof nodesById.get === 'function'
    ? (id) => nodesById.get(id)
    : (id) => nodesById[id]

  const leafToRoot = []
  let currentId = startNodeId
  const seen = new Set()

  while (currentId && !seen.has(currentId) && leafToRoot.length < MAX_CHAIN_DEPTH) {
    seen.add(currentId)
    const node = get(currentId)
    if (!node) break
    leafToRoot.push(node)
    currentId = node.parent_node_id || null
  }

  return leafToRoot.reverse()
}

/**
 * Merge field-link rows from root → leaf. Child wins on label/required/default overrides.
 *
 * Sticky disable (v785): once any ancestor sets enabled=false, descendants cannot
 * re-enable — `next.enabled = prev.enabled && (link.enabled !== false)`.
 *
 * Mandatory lock (v785): once any ancestor sets locked=true, descendants cannot
 * disable — merge forces enabled=true while the lock holds.
 *
 * Disabled fields remain in the map with enabled=false (caller may filter).
 *
 * @param {Array<Array<object>>} linksByTierRootToLeaf - one array of link rows per node
 * @returns {Map<string, object>} keyed by custom_field_definition_id
 */
export function mergeFieldLinksByChain(linksByTierRootToLeaf = []) {
  /** @type {Map<string, object>} */
  const merged = new Map()

  for (const tierLinks of linksByTierRootToLeaf) {
    for (const link of tierLinks || []) {
      const fieldId = link?.custom_field_definition_id
      if (!fieldId) continue

      const prev = merged.get(fieldId) || {
        custom_field_definition_id: fieldId,
        enabled: true,
        required: null,
        default_value: null,
        label: null,
        display_order: 0,
        is_local: false,
        source_node_id: null,
        locked: false,
        locked_by_node_id: null,
        sticky_disabled_by_node_id: null,
      }

      const ancestorLocked = prev.locked === true
      // Sticky disable: ancestor false stays false regardless of this tier's row
      let enabled = prev.enabled !== false && link.enabled !== false
      // Mandatory lock: descendants cannot disable a locked field
      if (ancestorLocked) {
        enabled = true
      }

      let stickyDisabledBy = prev.sticky_disabled_by_node_id || null
      if (prev.enabled !== false && link.enabled === false && !ancestorLocked) {
        stickyDisabledBy = link.node_id ?? stickyDisabledBy
      }
      if (ancestorLocked) {
        stickyDisabledBy = null
      }

      const locked = ancestorLocked || link.locked === true
      const lockedByNodeId = ancestorLocked
        ? prev.locked_by_node_id
        : link.locked === true
          ? (link.node_id ?? prev.locked_by_node_id)
          : prev.locked_by_node_id

      const next = {
        custom_field_definition_id: fieldId,
        enabled,
        required:
          link.required_override !== undefined && link.required_override !== null
            ? link.required_override
            : prev.required,
        default_value:
          link.default_value_override !== undefined && link.default_value_override !== null
            ? link.default_value_override
            : prev.default_value,
        label:
          link.label_override !== undefined && link.label_override !== null && link.label_override !== ''
            ? link.label_override
            : prev.label,
        display_order:
          link.display_order !== undefined && link.display_order !== null
            ? link.display_order
            : prev.display_order,
        is_local: link.is_local === true,
        source_node_id: link.node_id ?? prev.source_node_id,
        locked,
        locked_by_node_id: lockedByNodeId || null,
        sticky_disabled_by_node_id: stickyDisabledBy,
      }

      merged.set(fieldId, next)
    }
  }

  return merged
}

/**
 * Write-time gate: reject disable when an ancestor link has locked=true.
 * @param {object[]} chainRootToLeaf
 * @param {string} fieldId
 * @param {string|null|undefined} ownNodeId
 * @param {Map<string, object>} [fieldMap] - optional merged map (avoids extra query when provided with links)
 * @returns {{ ok: true } | { ok: false, message: string, lockedByTier: string|null }}
 */
export function checkAncestorFieldLock(chainRootToLeaf = [], fieldId, ownNodeId, fieldMap = null) {
  if (!fieldId) return { ok: true }
  if (fieldMap instanceof Map) {
    const merged = fieldMap.get(fieldId)
    if (merged?.locked && merged.locked_by_node_id && merged.locked_by_node_id !== ownNodeId) {
      const lockNode = (chainRootToLeaf || []).find((n) => n.id === merged.locked_by_node_id)
      const tier = lockNode?.tier || 'ancestor'
      return {
        ok: false,
        lockedByTier: tier,
        message: `Locked by ${tier} — this field must always be captured and cannot be disabled.`,
      }
    }
    return { ok: true }
  }
  const ownIndex = (chainRootToLeaf || []).findIndex((n) => n.id === ownNodeId)
  const ancestors = ownIndex >= 0 ? chainRootToLeaf.slice(0, ownIndex) : []
  for (const node of ancestors) {
    // Callers without fieldMap should pass links via fieldMap path; this is a soft no-op.
    void node
  }
  return { ok: true }
}

/**
 * Effective field list for UI consumption (enabled only, sorted by display_order).
 * @param {Map<string, object>|object[]} merged
 * @returns {object[]}
 */
export function listEnabledEffectiveFields(merged) {
  const values = merged instanceof Map ? [...merged.values()] : [...(merged || [])]
  return values
    .filter((f) => f?.enabled !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
}

/**
 * Nearest published node with domain_ref_id set, walking root → leaf (leaf wins).
 * @param {object[]} nodesRootToLeaf
 * @returns {object|null}
 */
export function pickNearestPublishedDocumentMaster(nodesRootToLeaf = []) {
  let found = null
  for (const node of nodesRootToLeaf) {
    if (
      node
      && node.status === 'published'
      && node.domain_ref_id
      && node.is_current !== false
    ) {
      found = node
    }
  }
  return found
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} nodeId
 * @returns {Promise<object[]>} root → leaf
 */
export async function fetchNodeChain(db, nodeId) {
  if (!db || !nodeId) return []

  /** @type {Map<string, object>} */
  const nodesById = new Map()
  let currentId = nodeId

  for (let i = 0; i < MAX_CHAIN_DEPTH && currentId; i += 1) {
    if (nodesById.has(currentId)) break
    const { data, error } = await db
      .from('pm_template_nodes')
      .select('*')
      .eq('id', currentId)
      .maybeSingle()
    if (error) throw error
    if (!data) break
    nodesById.set(data.id, data)
    currentId = data.parent_node_id || null
  }

  return buildNodeChainRootToLeaf(nodesById, nodeId)
}

/**
 * Resolve starting node for an entity+domain.
 * Prefer explicit assignment.node_id; else nearest current published/default PMO node
 * for the account (tier='pmo', scope null) when accountId is provided.
 *
 * When `options.category` is set (e.g. `risk_register`):
 * - Prefer an entity-scoped fields node with that category (avoids clobbering generic fields)
 * - Filter the PMO-default fallback by category
 * - Only use a generic assignment when its node category matches (or is null)
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} entityType
 * @param {string} entityId
 * @param {string} domain
 * @param {{ accountId?: string|null, category?: string|null }} [options]
 * @returns {Promise<string|null>}
 */
export async function resolveStartNodeId(db, entityType, entityId, domain, options = {}) {
  if (!db || !entityType || !entityId || !domain) return null

  const category = options.category || null

  const { data: assignment, error: assignErr } = await db
    .from('pm_template_entity_assignment')
    .select('node_id, account_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('domain', domain)
    .maybeSingle()

  if (assignErr) throw assignErr

  if (assignment?.node_id && !category) {
    return assignment.node_id
  }

  if (assignment?.node_id && category) {
    const { data: assignedNode, error: nodeErr } = await db
      .from('pm_template_nodes')
      .select('id, category')
      .eq('id', assignment.node_id)
      .maybeSingle()
    if (nodeErr) throw nodeErr
    if (assignedNode && (!assignedNode.category || assignedNode.category === category)) {
      return assignedNode.id
    }
  }

  const accountId = options.accountId || assignment?.account_id

  // Category-scoped entity node (Risk Register etc.) — independent of generic fields assignment
  if (category && domain === 'fields') {
    let scopedQ = db
      .from('pm_template_nodes')
      .select('id')
      .eq('domain', domain)
      .eq('category', category)
      .eq('scope_entity_type', entityType)
      .eq('scope_entity_id', entityId)
      .eq('is_current', true)
      .in('status', ['published', 'draft'])
      .order('version', { ascending: false })
      .limit(1)
    if (accountId) scopedQ = scopedQ.eq('account_id', accountId)
    const { data: scopedNode, error: scopedErr } = await scopedQ.maybeSingle()
    if (scopedErr) throw scopedErr
    if (scopedNode?.id) return scopedNode.id
  }

  if (!accountId) return null

  // Global normally wins the tiebreak (is_system_synced DESC) — but for the
  // tier-template domains, an account that has customised its own copy wants
  // that copy applied by default, not the raw Global master (v807 Gap 2/3).
  const preferOwnCopy = ACCOUNT_PREFERRED_DOMAINS.has(domain)
  let defaultQ = db
    .from('pm_template_nodes')
    .select('id')
    .eq('account_id', accountId)
    .eq('domain', domain)
    .eq('tier', 'pmo')
    .eq('is_current', true)
    .is('scope_entity_id', null)
    .in('status', ['published', 'draft'])
    .order('is_system_synced', { ascending: preferOwnCopy })
    .order('version', { ascending: false })
    .limit(1)

  if (category) {
    defaultQ = defaultQ.eq('category', category)
  }

  const { data: defaultNode, error: defaultErr } = await defaultQ.maybeSingle()

  if (defaultErr) throw defaultErr
  return defaultNode?.id || null
}

/**
 * Walk assignment → node chain and merge field links.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} entityType
 * @param {string} entityId
 * @param {{ accountId?: string|null, category?: string|null }} [options]
 * @returns {Promise<{ chain: object[], fields: object[], fieldMap: Map<string, object>, startNodeId: string|null }>}
 */
export async function resolveEffectiveFields(db, entityType, entityId, options = {}) {
  const startNodeId = await resolveStartNodeId(db, entityType, entityId, 'fields', options)
  if (!startNodeId) {
    return { chain: [], fields: [], fieldMap: new Map(), startNodeId: null }
  }

  const chain = await fetchNodeChain(db, startNodeId)
  if (!chain.length) {
    return { chain: [], fields: [], fieldMap: new Map(), startNodeId }
  }

  const nodeIds = chain.map((n) => n.id)
  const { data: links, error } = await db
    .from('pm_template_field_links')
    .select('*')
    .in('node_id', nodeIds)
    .order('display_order', { ascending: true })

  if (error) throw error

  const linksByNode = new Map(nodeIds.map((id) => [id, []]))
  for (const link of links || []) {
    const bucket = linksByNode.get(link.node_id)
    if (bucket) bucket.push(link)
  }

  const linksByTier = nodeIds.map((id) => linksByNode.get(id) || [])
  const fieldMap = mergeFieldLinksByChain(linksByTier)
  await hydrateFieldLabelsFromDefinitions(db, fieldMap)
  const fields = listEnabledEffectiveFields(fieldMap)

  return { chain, fields, fieldMap, startNodeId }
}

/**
 * Fill missing link labels from custom_field_definitions so instance-local fields
 * (created without label_override) show a human name instead of a bare UUID.
 * Also attaches field_code / field_type for UI display.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {Map<string, object>} fieldMap
 */
export async function hydrateFieldLabelsFromDefinitions(db, fieldMap) {
  if (!db || !fieldMap?.size) return fieldMap
  const ids = [...fieldMap.keys()]
  const { data, error } = await db
    .from('custom_field_definitions')
    .select('id, field_code, label, field_type')
    .in('id', ids)
  if (error) throw error

  const byId = new Map((data || []).map((d) => [d.id, d]))
  for (const [id, field] of fieldMap) {
    const def = byId.get(id)
    if (!def) continue
    if (field.label == null || field.label === '') {
      field.label = def.label || null
    }
    if (field.field_code == null) field.field_code = def.field_code || null
    if (field.field_type == null) field.field_type = def.field_type || null
  }
  return fieldMap
}

/**
 * Walk the same chain; return nearest published node with domain_ref_id.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} entityType
 * @param {string} entityId
 * @param {string} domain
 * @param {{ accountId?: string|null }} [options]
 * @returns {Promise<object|null>}
 */
export async function resolveEffectiveDocumentMaster(db, entityType, entityId, domain, options = {}) {
  if (!domain || domain === 'fields') return null

  const startNodeId = await resolveStartNodeId(db, entityType, entityId, domain, options)
  if (!startNodeId) return null

  const chain = await fetchNodeChain(db, startNodeId)
  return pickNearestPublishedDocumentMaster(chain)
}

/**
 * Resolve a project's Programme/Portfolio ancestry — the extra tier scopes (beyond "always
 * PMO" and "this project itself") that apply when picking its nearest-tier template per
 * domain (v824).
 *
 * Platform (`public`) and Simulator (`sim`) both use join tables (there is no
 * `projects.programme_id` column — see v606a / v705). Platform:
 * `programme_projects` / `portfolio_projects`. Simulator: `practice_programme_projects` /
 * `practice_portfolio_projects`. A project may link to more than one programme/portfolio;
 * this takes the first match, which is enough for nearest-tier template resolution.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db - platformDb or simDb
 * @param {string} projectId
 * @param {{ schema?: 'public'|'sim' }} [options]
 * @returns {Promise<{ programmeId: string|null, portfolioId: string|null }>}
 */
export async function resolveProjectTierAncestry(db, projectId, { schema = 'public' } = {}) {
  if (!db || !projectId) return { programmeId: null, portfolioId: null }

  if (schema === 'sim') {
    const [{ data: programmeLink }, { data: portfolioLink }] = await Promise.all([
      db.from('practice_programme_projects').select('practice_programme_id').eq('practice_project_id', projectId).limit(1).maybeSingle(),
      db.from('practice_portfolio_projects').select('practice_portfolio_id').eq('practice_project_id', projectId).limit(1).maybeSingle(),
    ])
    const programmeId = programmeLink?.practice_programme_id || null
    let portfolioId = portfolioLink?.practice_portfolio_id || null
    if (!portfolioId && programmeId) {
      const { data: programme } = await db
        .from('practice_programmes')
        .select('practice_portfolio_id')
        .eq('id', programmeId)
        .maybeSingle()
      portfolioId = programme?.practice_portfolio_id || null
    }
    return { programmeId, portfolioId }
  }

  // public: join tables only — projects.programme_id does not exist
  const [{ data: programmeLink, error: programmeLinkErr }, { data: portfolioLink, error: portfolioLinkErr }] =
    await Promise.all([
      db.from('programme_projects').select('programme_id').eq('project_id', projectId).limit(1).maybeSingle(),
      db.from('portfolio_projects').select('portfolio_id').eq('project_id', projectId).limit(1).maybeSingle(),
    ])
  if (programmeLinkErr) throw programmeLinkErr
  if (portfolioLinkErr) throw portfolioLinkErr

  const programmeId = programmeLink?.programme_id || null
  let portfolioId = portfolioLink?.portfolio_id || null

  if (!portfolioId && programmeId) {
    const { data: programme, error: programmeErr } = await db
      .from('programmes')
      .select('portfolio_id')
      .eq('id', programmeId)
      .maybeSingle()
    if (programmeErr) throw programmeErr
    portfolioId = programme?.portfolio_id || null
  }

  return { programmeId, portfolioId }
}

/**
 * Group already-loaded org template nodes into "families" (same underlying template at
 * different tiers), then keep only the nearest tier applicable to a given project — the
 * "PMO → Portfolio → Programme → Project, nearest wins" model (v824). Client-side, over rows
 * already fetched via listTemplateLibraryNodes — no extra DB round-trips.
 *
 * A Project-tier fork's parent_node_id points at whatever it was forked *from* (often the PMO
 * copy, not the original Global master) — so two rows can be "the same template" at different
 * tiers. Family key = walk each row's parent_node_id chain as far as it stays within the
 * candidate set; where that walk stops (parent is outside the set — i.e. Global, or none) is
 * the family's key.
 *
 * @param {object[]} rows - pm_template_nodes rows (is_system_synced=false)
 * @param {{ projectId: string, programmeId?: string|null, portfolioId?: string|null }} scope
 * @returns {object[]} nearest-tier-per-family rows, applicable to this project
 */
const TIER_PRIORITY = { project: 3, programme: 2, portfolio: 1, pmo: 0 }

export function resolveNearestTierPerFamily(rows = [], { projectId, programmeId = null, portfolioId = null } = {}) {
  const applies = (row) => {
    if (row.tier === 'pmo') return row.scope_entity_type === 'account' || !row.scope_entity_id
    if (row.tier === 'project') return row.scope_entity_id === projectId
    if (row.tier === 'programme') return !!programmeId && row.scope_entity_id === programmeId
    if (row.tier === 'portfolio') return !!portfolioId && row.scope_entity_id === portfolioId
    return false
  }

  const candidates = (rows || []).filter(applies)
  const byId = new Map(candidates.map((r) => [r.id, r]))

  const familyKeyOf = (row) => {
    let current = row
    const seen = new Set()
    while (current?.parent_node_id && byId.has(current.parent_node_id) && !seen.has(current.id)) {
      seen.add(current.id)
      current = byId.get(current.parent_node_id)
    }
    return current.id
  }

  const nearestByFamily = new Map()
  for (const row of candidates) {
    const key = familyKeyOf(row)
    const existing = nearestByFamily.get(key)
    if (!existing || TIER_PRIORITY[row.tier] > TIER_PRIORITY[existing.tier]) {
      nearestByFamily.set(key, row)
    }
  }

  return [...nearestByFamily.values()]
}

/** Project Templates list — only copies owned by this project (tier = project). */
export function filterProjectOwnTemplateNodes(rows = [], projectId) {
  if (!projectId) return []
  return (rows || []).filter((r) => r.tier === 'project' && r.scope_entity_id === projectId)
}

/**
 * Organisational Templates in PM project context — nearest tier per family, excluding
 * this project's own copies (those belong under Project Templates).
 *
 * Note: the org/PMO *source* of an already-copied family is intentionally kept here so
 * callers that only need "nearest without project rows" still see lineage. For copy-down
 * / capture UIs use {@link resolveOrgTemplatesAvailableToCopy} instead.
 */
export function resolveOrgTemplatesForProject(
  rows = [],
  { projectId, programmeId = null, portfolioId = null } = {},
) {
  const withoutProjectOwn = (rows || []).filter(
    (r) => !(r.tier === 'project' && r.scope_entity_id === projectId),
  )
  return resolveNearestTierPerFamily(withoutProjectOwn, { projectId, programmeId, portfolioId })
}

/**
 * Drop org/PMO candidates that already have a project copy in the same template family.
 * Copy-down is rejected with ALREADY_COPIED for those families — they must not stay listed
 * as available on Organisational Templates or Project Documents.
 *
 * @param {object[]} candidates
 * @param {object[]} projectCopies
 * @param {object[]} allRows
 * @returns {object[]}
 */
export function excludeAlreadyCopiedTemplateFamilies(candidates = [], projectCopies = [], allRows = []) {
  if (!candidates.length || !projectCopies.length) return candidates

  const byId = new Map()
  for (const r of [...allRows, ...candidates, ...projectCopies]) {
    if (r?.id) byId.set(r.id, r)
  }

  const blockedIds = new Set()
  const copiedFamilyRoots = new Set()

  for (const copy of projectCopies) {
    let current = copy
    const seen = new Set()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      blockedIds.add(current.id)
      const parentId = current.parent_node_id
      if (!parentId) {
        copiedFamilyRoots.add(current.id)
        break
      }
      if (byId.has(parentId)) {
        current = byId.get(parentId)
      } else {
        // Parent is outside the account set (typically Global) — shared family key.
        copiedFamilyRoots.add(parentId)
        break
      }
    }
  }

  return candidates.filter((candidate) => {
    if (blockedIds.has(candidate.id)) return false
    let current = candidate
    const seen = new Set()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      if (blockedIds.has(current.id)) return false
      const parentId = current.parent_node_id
      if (!parentId) return !copiedFamilyRoots.has(current.id)
      if (byId.has(parentId)) {
        current = byId.get(parentId)
      } else {
        return !copiedFamilyRoots.has(parentId)
      }
    }
    return true
  })
}

/**
 * Organisational templates still available to copy down for this project (excludes families
 * that already have a project-owned copy under Project Templates / Project Documents).
 */
export function resolveOrgTemplatesAvailableToCopy(
  rows = [],
  { projectId, programmeId = null, portfolioId = null } = {},
) {
  const scope = { projectId, programmeId, portfolioId }
  return excludeAlreadyCopiedTemplateFamilies(
    resolveOrgTemplatesForProject(rows, scope),
    filterProjectOwnTemplateNodes(rows, projectId),
    rows,
  )
}
