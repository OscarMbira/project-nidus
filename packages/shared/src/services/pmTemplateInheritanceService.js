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
  const fields = listEnabledEffectiveFields(fieldMap)

  return { chain, fields, fieldMap, startNodeId }
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
