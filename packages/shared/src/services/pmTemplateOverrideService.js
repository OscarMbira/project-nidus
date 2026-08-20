/**
 * Resolve whether an account already has its own customised copy of a specific
 * Global template — distinct from pmTemplateInheritanceService's resolveStartNodeId,
 * which resolves ONE governing node per domain (right for fields/industry_plan/opa,
 * wrong for process_template/level templates: many independently-named documents
 * per domain, not one). The correct key here is parent_node_id, set by
 * copyTemplateNodeForAccount to the global source node's id.
 */

/**
 * @param {object} db - platformDb or simDb
 * @param {{ accountId: string, globalNodeId: string, tier?: string, scopeEntityType?: string, scopeEntityId?: string|null }} opts
 *   `tier`/`scopeEntityType`/`scopeEntityId` narrow the match to a specific tier instance
 *   (e.g. one Project, one Portfolio) rather than "this account has a copy anywhere" — pass
 *   all three (matching what copyTemplateNodeForAccount was called with) to correctly tell a
 *   PMO-wide copy apart from a copy scoped to one specific project. Omit for the old
 *   any-scope behaviour.
 * @returns {Promise<object|null>} the account's override node, or null if none exists
 */
export async function resolveAccountTemplateOverride(db, { accountId, globalNodeId, tier, scopeEntityType, scopeEntityId } = {}) {
  if (!db || !accountId || !globalNodeId) return null
  let query = db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('parent_node_id', globalNodeId)
    .eq('is_system_synced', false)
    .eq('is_current', true)
  if (tier) query = query.eq('tier', tier)
  if (scopeEntityType) {
    query = query.eq('scope_entity_type', scopeEntityType)
    query = scopeEntityId ? query.eq('scope_entity_id', scopeEntityId) : query.is('scope_entity_id', null)
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data || null
}

/**
 * Batched form of resolveAccountTemplateOverride — one query for the whole
 * Global Template Library page instead of one query per row. The original N+1
 * version (Promise.all over resolveAccountTemplateOverride per row) caused a
 * multi-second load on ~400 rows.
 *
 * Deliberately NOT `.in('parent_node_id', globalNodeIds)` — a first pass at
 * this batching used that, but with ~400 ids that's a single request carrying
 * a 10,000+ character query string, which just traded 401 small fast requests
 * for one disproportionately expensive one (URL size + a huge IN-list for
 * Postgres to evaluate). Instead, fetch this account's own override rows —
 * bounded by how many templates THIS account has customised, not by the size
 * of the Global catalog being browsed — and match against the requested ids
 * in JS, which is a tiny in-memory filter over a small result set.
 *
 * @param {object} db - platformDb or simDb
 * @param {{ accountId: string, globalNodeIds: string[], tier?: string, scopeEntityType?: string, scopeEntityId?: string|null }} opts
 *   `tier`/`scopeEntityType`/`scopeEntityId` narrow every match to one specific tier instance
 *   (see resolveAccountTemplateOverride) — omit for the old any-scope behaviour.
 * @returns {Promise<Map<string, object>>} keyed by globalNodeId -> the account's override node
 */
export async function resolveAccountTemplateOverrideBatch(db, { accountId, globalNodeIds = [], tier, scopeEntityType, scopeEntityId } = {}) {
  const ids = new Set((globalNodeIds || []).filter(Boolean))
  if (!db || !accountId || !ids.size) return new Map()

  let query = db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_system_synced', false)
    .eq('is_current', true)
  if (tier) query = query.eq('tier', tier)
  if (scopeEntityType) {
    query = query.eq('scope_entity_type', scopeEntityType)
    query = scopeEntityId ? query.eq('scope_entity_id', scopeEntityId) : query.is('scope_entity_id', null)
  }
  const { data, error } = await query
    .not('parent_node_id', 'is', null)
    .order('created_at', { ascending: false })
  if (error) throw error

  const result = new Map()
  for (const row of data || []) {
    if (!row.parent_node_id || !ids.has(row.parent_node_id)) continue
    // Ordered created_at DESC, so the first row seen per parent_node_id is the
    // most recent — matches resolveAccountTemplateOverride's own .limit(1).
    if (!result.has(row.parent_node_id)) result.set(row.parent_node_id, row)
  }
  return result
}

/**
 * Reverse lookup for OPA provenance (v807 Gap 4): given the ids of
 * organisation-owned pm_template_nodes rows (e.g. organisational_process_assets
 * .pm_template_node_id), resolve each one's Global source node ({id, name}) via
 * parent_node_id — batched into two queries, not N+1 per row.
 *
 * @param {object} db - platformDb or simDb
 * @param {string[]} pmTemplateNodeIds
 * @returns {Promise<Map<string, {id: string, name: string}>>} keyed by the org node id
 */
export async function resolveTemplateProvenanceBatch(db, pmTemplateNodeIds = []) {
  const ids = [...new Set((pmTemplateNodeIds || []).filter(Boolean))]
  if (!db || !ids.length) return new Map()

  const { data: nodes, error } = await db
    .from('pm_template_nodes')
    .select('id, parent_node_id')
    .in('id', ids)
  if (error) throw error

  const parentIds = [...new Set((nodes || []).map((n) => n.parent_node_id).filter(Boolean))]
  if (!parentIds.length) return new Map()

  const { data: sources, error: srcErr } = await db
    .from('pm_template_nodes')
    .select('id, name')
    .in('id', parentIds)
  if (srcErr) throw srcErr

  const sourceById = new Map((sources || []).map((s) => [s.id, s]))
  const result = new Map()
  for (const n of nodes || []) {
    if (n.parent_node_id && sourceById.has(n.parent_node_id)) {
      result.set(n.id, sourceById.get(n.parent_node_id))
    }
  }
  return result
}
