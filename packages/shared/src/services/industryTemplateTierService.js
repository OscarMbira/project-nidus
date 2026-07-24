import { resolveEffectiveDocumentMaster } from './pmTemplateInheritanceService.js'
import {
  createTierDocumentTemplateNode,
  getOrCreateEntityAssignment,
} from './pmTemplateNodeService.js'

/**
 * Fork the effective industry_plan document master for a portfolio/programme (or other tier).
 *
 * @param {object} db - platformDb or simDb (nodes / assignments live here)
 * @param {object} opts
 * @param {string} opts.accountId
 * @param {string} opts.entityType - e.g. 'portfolio' | 'programme'
 * @param {string} opts.entityId
 * @param {string} opts.tier
 * @param {string} [opts.entityName]
 * @param {string|null} [opts.userId]
 * @param {string|null} [opts.templateId] - optional explicit master template id (skips resolve when set with node)
 * @param {(id: string) => Promise<object>} opts.duplicateTemplateFn - deep-copy pmo_industry_templates + children
 * @param {object} [opts.catalogDb] - db client that owns pmo_industry_templates (defaults to db; Platform catalog is public)
 */
export async function forkIndustryTemplateForEntity(db, {
  accountId,
  entityType,
  entityId,
  tier,
  entityName = '',
  userId = null,
  templateId = null,
  duplicateTemplateFn,
  catalogDb = null,
}) {
  if (!db) throw new Error('db is required')
  if (!accountId) throw new Error('accountId is required')
  if (!entityType || !entityId) throw new Error('entityType and entityId are required')
  if (!tier) throw new Error('tier is required')
  if (typeof duplicateTemplateFn !== 'function') {
    throw new Error('duplicateTemplateFn is required')
  }

  const catalog = catalogDb || db
  let master = null

  if (templateId) {
    master = { id: null, domain_ref_id: templateId, name: entityName || 'Industry plan' }
  } else {
    master = await resolveEffectiveDocumentMaster(db, entityType, entityId, 'industry_plan', {
      accountId,
    })
  }

  if (!master?.domain_ref_id) {
    throw new Error('No industry plan master to fork')
  }

  const template = await duplicateTemplateFn(master.domain_ref_id)
  if (!template?.id) {
    throw new Error('duplicateTemplateFn did not return a template')
  }

  const node = await createTierDocumentTemplateNode(db, {
    accountId,
    tier,
    domain: 'industry_plan',
    scopeEntityType: entityType,
    scopeEntityId: entityId,
    name: `${entityName || entityType} — ${template.industry_name || 'Industry plan'}`,
    description: template.description || null,
    category: template.industry_code || null,
    parentNodeId: master.id || null,
    domainRefId: template.id,
    userId,
  })

  const { error: linkErr } = await catalog
    .from('pmo_industry_templates')
    .update({
      pm_template_node_id: node.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', template.id)
  if (linkErr) throw linkErr

  let assignment = await getOrCreateEntityAssignment(db, {
    accountId,
    entityType,
    entityId,
    domain: 'industry_plan',
    nodeId: node.id,
  })

  if (assignment && assignment.node_id !== node.id) {
    const { data: updated, error: assignErr } = await db
      .from('pm_template_entity_assignment')
      .update({ node_id: node.id, updated_at: new Date().toISOString() })
      .eq('id', assignment.id)
      .select()
      .single()
    if (assignErr) throw assignErr
    assignment = updated
  }

  return { template, node, assignment }
}

/**
 * Fork a legacy_document or structured_list master for a portfolio/programme tier.
 *
 * @param {object} db
 * @param {object} opts
 * @param {'legacy_document'|'structured_list'} opts.domain
 * @param {(id: string) => Promise<{ template: object }|object>} opts.duplicateFn
 */
export async function forkLegacyTemplateForEntity(db, {
  accountId,
  entityType,
  entityId,
  tier,
  domain,
  entityName = '',
  userId = null,
  templateId = null,
  duplicateFn,
  catalogDb = null,
}) {
  if (!db) throw new Error('db is required')
  if (!accountId) throw new Error('accountId is required')
  if (!['legacy_document', 'structured_list'].includes(domain)) {
    throw new Error('domain must be legacy_document or structured_list')
  }
  if (typeof duplicateFn !== 'function') throw new Error('duplicateFn is required')

  const catalog = catalogDb || db
  let master = null
  if (templateId) {
    master = { id: null, domain_ref_id: templateId, name: entityName || domain }
  } else {
    master = await resolveEffectiveDocumentMaster(db, entityType, entityId, domain, { accountId })
  }
  if (!master?.domain_ref_id) {
    throw new Error(`No ${domain} master to fork`)
  }

  const duplicated = await duplicateFn(master.domain_ref_id)
  const template = duplicated?.template || duplicated
  if (!template?.id) throw new Error('duplicateFn did not return a template')

  const table = domain === 'legacy_document'
    ? 'pmo_legacy_document_templates'
    : 'pmo_legacy_structured_lists'

  const node = await createTierDocumentTemplateNode(db, {
    accountId,
    tier,
    domain,
    scopeEntityType: entityType,
    scopeEntityId: entityId,
    name: `${entityName || entityType} — ${template.title || domain}`,
    description: template.extracted_text
      ? String(template.extracted_text).slice(0, 280)
      : (template.list_type || null),
    category: template.doc_category || template.list_type || null,
    parentNodeId: master.id || null,
    domainRefId: template.id,
    userId,
  })

  const { error: linkErr } = await catalog
    .from(table)
    .update({
      pm_template_node_id: node.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', template.id)
  if (linkErr) throw linkErr

  let assignment = await getOrCreateEntityAssignment(db, {
    accountId,
    entityType,
    entityId,
    domain,
    nodeId: node.id,
  })

  if (assignment && assignment.node_id !== node.id) {
    const { data: updated, error: assignErr } = await db
      .from('pm_template_entity_assignment')
      .update({ node_id: node.id, updated_at: new Date().toISOString() })
      .eq('id', assignment.id)
      .select()
      .single()
    if (assignErr) throw assignErr
    assignment = updated
  }

  return { template, node, assignment }
}
