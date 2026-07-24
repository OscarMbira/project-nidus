/**
 * Thin data access for pm_template_nodes (Phase 2 fields domain).
 * Pass platformDb or simDb.
 */
import { isValidUUID } from '@nidus/shared/utils/inputValidation'

export async function listFieldTemplateNodes(db, accountId, { tier = null } = {}) {
  if (!db || !accountId) return []
  let q = db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('domain', 'fields')
    .eq('is_current', true)
    .order('tier')
    .order('name')
  if (tier) q = q.eq('tier', tier)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

/** Resolves by template_reference (display ID) first, falling back to the raw UUID — backward compatible (CLAUDE.md rule 16.1). */
export async function getTemplateNode(db, nodeIdOrReference) {
  if (!db || !nodeIdOrReference) return null
  const column = isValidUUID(nodeIdOrReference) ? 'id' : 'template_reference'
  const { data, error } = await db
    .from('pm_template_nodes')
    .select('*')
    .eq(column, nodeIdOrReference)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listFieldLinksForNode(db, nodeId) {
  if (!db || !nodeId) return []
  const { data, error } = await db
    .from('pm_template_field_links')
    .select('*, custom_field_definitions(id, field_code, label, field_type)')
    .eq('node_id', nodeId)
    .order('display_order')
  if (error) throw error
  return data || []
}

export async function upsertFieldLink(db, row) {
  const { data, error } = await db
    .from('pm_template_field_links')
    .upsert(row, { onConflict: 'node_id,custom_field_definition_id' })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPmoFieldTemplateNode(db, {
  accountId,
  name,
  description = null,
  category = null,
  parentNodeId = null,
  userId = null,
}) {
  const { data, error } = await db
    .from('pm_template_nodes')
    .insert({
      account_id: accountId,
      tier: 'pmo',
      domain: 'fields',
      parent_node_id: parentNodeId,
      scope_entity_type: 'account',
      scope_entity_id: null,
      name,
      description,
      category,
      status: 'draft',
      version: 1,
      is_current: true,
      is_system_synced: false,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Generalized node creator for any tier (portfolio/sub_portfolio/programme/project),
 * scoped to a specific entity — unlike createPmoFieldTemplateNode, which is
 * always account-wide. Used when a manager below PMO first overrides an
 * inherited field or adds a local one.
 */
export async function createTierFieldTemplateNode(db, {
  accountId,
  tier,
  scopeEntityType,
  scopeEntityId,
  name,
  description = null,
  category = null,
  parentNodeId = null,
  userId = null,
}) {
  return createTierDocumentTemplateNode(db, {
    accountId,
    tier,
    domain: 'fields',
    scopeEntityType,
    scopeEntityId,
    name,
    description,
    category,
    parentNodeId,
    domainRefId: null,
    userId,
  })
}

/**
 * Tier-scoped document/fields node (portfolio / programme / project / …).
 * Same insert shape as createTierFieldTemplateNode, with configurable domain + domain_ref_id.
 */
export async function createTierDocumentTemplateNode(db, {
  accountId,
  tier,
  domain,
  scopeEntityType,
  scopeEntityId,
  name,
  description = null,
  category = null,
  parentNodeId = null,
  domainRefId = null,
  userId = null,
}) {
  if (!domain) throw new Error('domain is required')
  const { data, error } = await db
    .from('pm_template_nodes')
    .insert({
      account_id: accountId,
      tier,
      domain,
      domain_ref_id: domainRefId,
      parent_node_id: parentNodeId,
      scope_entity_type: scopeEntityType,
      scope_entity_id: scopeEntityId,
      name,
      description,
      category,
      status: 'published',
      version: 1,
      is_current: true,
      is_system_synced: false,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function publishTemplateNode(db, nodeId) {
  const { data, error } = await db
    .from('pm_template_nodes')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', nodeId)
    .eq('is_system_synced', false)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

/** Generic metadata update (name/description/category) on an account-owned node. */
export async function updateTemplateNode(db, nodeId, { name, description, category } = {}) {
  const patch = { updated_at: new Date().toISOString() }
  if (name !== undefined) patch.name = name
  if (description !== undefined) patch.description = description
  if (category !== undefined) patch.category = category
  const { data, error } = await db
    .from('pm_template_nodes')
    .update(patch)
    .eq('id', nodeId)
    .eq('is_system_synced', false)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Soft-delete: pm_template_nodes has no is_deleted column, only is_current — setting
 * it false is this table's established "no longer active" convention (used for version
 * supersession) and is what every read query here already filters on.
 */
export async function archiveTemplateNode(db, nodeId) {
  const { data, error } = await db
    .from('pm_template_nodes')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('id', nodeId)
    .eq('is_system_synced', false)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getOrCreateEntityAssignment(db, {
  accountId,
  entityType,
  entityId,
  domain = 'fields',
  nodeId = null,
}) {
  const { data: existing, error: findErr } = await db
    .from('pm_template_entity_assignment')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('domain', domain)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing

  const { data, error } = await db
    .from('pm_template_entity_assignment')
    .insert({
      account_id: accountId,
      entity_type: entityType,
      entity_id: entityId,
      domain,
      node_id: nodeId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
