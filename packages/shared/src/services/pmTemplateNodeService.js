/**
 * Thin data access for pm_template_nodes (Phase 2 fields domain).
 * Pass platformDb or simDb.
 */
import { isValidUUID } from '@nidus/shared/utils/inputValidation'

/** public.users.id for the authenticated session (pm_template_nodes.created_by FK). */
async function resolveInternalUserId(db) {
  if (!db?.auth?.getUser && !db?.auth?.getSession) return null
  let authUserId = null
  if (db.auth.getSession) {
    const { data: { session } } = await db.auth.getSession()
    authUserId = session?.user?.id || null
  }
  if (!authUserId && db.auth.getUser) {
    const { data: { user } } = await db.auth.getUser()
    authUserId = user?.id || null
  }
  if (!authUserId) return null
  const { data } = await db
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return data?.id || null
}

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
  const createdBy = userId || await resolveInternalUserId(db)
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
      created_by: createdBy,
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
  const createdBy = userId || await resolveInternalUserId(db)
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
      created_by: createdBy,
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

/**
 * Soft-archive a process_template catalog row (v849). Tables already have is_deleted (v629).
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} table - one of PROCESS_TEMPLATE_TABLES
 * @param {string} id - catalog row uuid
 */
export async function archiveProcessTemplateContent(db, table, id) {
  if (!db || !table || !id) throw new Error('db, table, and id are required')
  const { data, error } = await db
    .from(table)
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

async function resolveProcessTemplateTableForNode(db, node) {
  if (!node?.domain_ref_id) return null
  const { data: byNode } = await db
    .from('process_template_node_links')
    .select('document_table')
    .eq('node_id', node.id)
    .maybeSingle()
  if (byNode?.document_table) return byNode.document_table
  const { data: byDoc } = await db
    .from('process_template_node_links')
    .select('document_table')
    .eq('document_id', node.domain_ref_id)
    .maybeSingle()
  return byDoc?.document_table || null
}

/**
 * Retire a process_template project copy: archive the node AND its linked catalog row.
 * Both must succeed — throws with a clear message on partial failure.
 */
export async function archiveProcessTemplateNodeAndContent(db, node) {
  if (!db || !node?.id) throw new Error('db and node are required')
  const archivedNode = await archiveTemplateNode(db, node.id)
  if (!archivedNode) throw new Error('Could not archive template node')

  if (node.domain === 'process_template' && node.domain_ref_id) {
    const table = await resolveProcessTemplateTableForNode(db, node)
    if (!table) {
      throw new Error(
        'Template node was retired but the linked document table could not be resolved — catalog row may still be active',
      )
    }
    try {
      await archiveProcessTemplateContent(db, table, node.domain_ref_id)
    } catch (e) {
      throw new Error(
        `Template node was retired but archiving the document row failed: ${e.message || e}`,
      )
    }
  }
  return archivedNode
}

/**
 * All archived (is_current=false) project-tier process_template copies for one project.
 * Used by the Project Documents register to avoid N+1 per-candidate lookups (v849/v851 perf).
 */
export async function listArchivedProjectProcessTemplateCopies(
  db,
  { accountId, projectId } = {},
) {
  if (!db || !accountId || !projectId) return []
  const { data, error } = await db
    .from('pm_template_nodes')
    .select(
      'id, name, tier, domain, methodology, parent_node_id, scope_entity_id, template_reference, status, domain_ref_id, is_current, is_system_synced, updated_at',
    )
    .eq('account_id', accountId)
    .eq('tier', 'project')
    .eq('scope_entity_id', projectId)
    .eq('domain', 'process_template')
    .eq('is_current', false)
    .eq('is_system_synced', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Find an archived (is_current=false) project-tier copy forked from this source (or its family).
 */
export async function findArchivedProjectProcessTemplateCopy(
  db,
  { accountId, projectId, parentNodeId, candidateParentIds = [] } = {},
) {
  if (!db || !accountId || !projectId) return null
  const parentIds = [...new Set([parentNodeId, ...candidateParentIds].filter(Boolean))]
  if (!parentIds.length) return null

  const { data, error } = await db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('tier', 'project')
    .eq('scope_entity_id', projectId)
    .eq('domain', 'process_template')
    .eq('is_current', false)
    .eq('is_system_synced', false)
    .in('parent_node_id', parentIds)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

/**
 * Match archived project copies to a candidate's family.
 * Prefers a fork from the candidate itself, then nearer ancestors.
 * `archivedCopies` should already be sorted newest-first (ties per parent).
 */
export function matchArchivedCopyForCandidate(candidate, allRows, archivedCopies = []) {
  if (!candidate?.id || !archivedCopies.length) return null
  const byId = new Map((allRows || []).map((r) => [r.id, r]))
  const ancestorOrder = []
  let current = candidate
  const seen = new Set()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    ancestorOrder.push(current.id)
    current = current.parent_node_id ? byId.get(current.parent_node_id) : null
  }
  const archivedByParent = new Map()
  for (const archived of archivedCopies) {
    if (archived?.parent_node_id && !archivedByParent.has(archived.parent_node_id)) {
      archivedByParent.set(archived.parent_node_id, archived)
    }
  }
  for (const parentId of ancestorOrder) {
    const hit = archivedByParent.get(parentId)
    if (hit) return hit
  }
  return null
}

/**
 * Restore a retired project process document: un-archive catalog row + set node is_current=true.
 */
export async function restoreArchivedProjectProcessTemplate(db, archivedNode) {
  if (!db || !archivedNode?.id) throw new Error('db and archivedNode are required')

  if (archivedNode.domain === 'process_template' && archivedNode.domain_ref_id) {
    const table = await resolveProcessTemplateTableForNode(db, archivedNode)
    if (table) {
      const { error: contentErr } = await db
        .from(table)
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', archivedNode.domain_ref_id)
      if (contentErr) throw contentErr
    }
  }

  const { data, error } = await db
    .from('pm_template_nodes')
    .update({ is_current: true, updated_at: new Date().toISOString() })
    .eq('id', archivedNode.id)
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
