/**
 * Copy / fork a system-synced pm_template_nodes row into an account-owned editable node.
 * Fields: clone field-links. opa: duplicate row scoped to the copying user/account.
 * process_template: duplicate row as an account-level PMO customisation by default
 * (SQL/v804), or project-scoped when copying from inside a real project.
 * form_template: duplicate row as an account-level PMO customisation (SQL/v809),
 * same account-copy pattern as opa/process_template — new template_code, cloned
 * current schema version.
 */

import {
  createTierDocumentTemplateNode,
  createPmoFieldTemplateNode,
  getTemplateNode,
  listFieldLinksForNode,
  upsertFieldLink,
  getOrCreateEntityAssignment,
} from './pmTemplateNodeService.js'
import {
  toProjectDocumentLabel,
  withCustomNameSuffix,
} from '../utils/projectDocumentNaming.js'

const COPYABLE_DOMAINS = new Set(['fields', 'opa', 'process_template', 'form_template', 'portfolio_template', 'programme_template', 'project_template'])

// process_template content is polymorphic — the actual row lives in one of these tables
// (see public._sync_global_process_template_catalog, SQL/v777), not a single dedicated
// catalog like form_template/opa. There's no pm_template_node_id column on any of them —
// SQL/v766 added a dedicated public.process_template_node_links(document_table, document_id,
// node_id) join table instead, specifically "to avoid altering ~24 tables". Use that for both
// finding the source table and linking the copy back; only probe the tables directly if a
// source row predates that link (e.g. seeded without one).
const PROCESS_TEMPLATE_TABLES = [
  'project_charters', 'assumption_logs', 'project_management_plans',
  'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
  'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
  'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
  'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
  'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
  'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
  'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents',
]

async function findProcessTemplateTableByProbe(db, sourceId) {
  const hits = await Promise.all(
    PROCESS_TEMPLATE_TABLES.map((table) =>
      db.from(table).select('id').eq('id', sourceId).maybeSingle()
        .then(({ data }) => (data ? table : null))
        .catch(() => null),
    ),
  )
  return hits.find(Boolean) || null
}

async function findProcessTemplateTable(db, sourceId) {
  const { data } = await db
    .from('process_template_node_links')
    .select('document_table')
    .eq('document_id', sourceId)
    .maybeSingle()
  if (data?.document_table) return data.document_table
  return findProcessTemplateTableByProbe(db, sourceId)
}

// RLS (SQL/v708 + v804) allows three shapes per row: a global master (is_master=true,
// project_id NULL, PMO-admin-only write), a project-scoped copy (is_master=false,
// project_id NOT NULL, caller has access to that project), or an account-level PMO
// customisation (is_master=false, project_id NULL, account_id = the org, caller is a
// PMO admin with access to that account) — the primary path: PMO customises the org's
// own copy of a Global template, same pattern as createPmoFieldTemplateNode for `fields`.
// Project-scoped is a secondary option, used only when copying from inside a real project.
async function duplicateProcessTemplateRow(db, sourceId, { accountId, projectId, nameSuffix = ' (custom)' } = {}) {
  const table = await findProcessTemplateTable(db, sourceId)
  if (!table) throw new Error('process_template source row not found in any known catalog table')
  const { data: src, error } = await db.from(table).select('*').eq('id', sourceId).maybeSingle()
  if (error) throw error
  if (!src) throw new Error(`${table} row not found`)
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    is_master: _m,
    project_id: _p,
    practice_project_id: _pp,
    account_id: _a,
    is_deleted: _del,
    ...rest
  } = src
  // public tables use project_id; sim tables use practice_project_id (v629/v842).
  // Detect from the source row so the same helper works with platformDb and simDb.
  const isSimSchema = Object.prototype.hasOwnProperty.call(src, 'practice_project_id')
  // Project captures are project documents — drop "Template"/"Master"/(custom) from the title.
  const baseTitle = rest.title || 'Process document'
  const title = projectId
    ? toProjectDocumentLabel(baseTitle) || 'Process document'
    : withCustomNameSuffix(baseTitle, 'Process document')
  const insertRow = {
    ...rest,
    title,
    is_master: false,
    is_deleted: false,
    account_id: accountId,
  }
  if (isSimSchema) {
    insertRow.practice_project_id = projectId || null
  } else {
    insertRow.project_id = projectId || null
  }
  const { data, error: insErr } = await db
    .from(table)
    .insert(insertRow)
    .select()
    .single()
  if (insErr) throw insErr
  return { ...data, __table: table }
}

// organisational_process_assets RLS (SQL/v400) requires created_by = auth.uid() (the raw
// Supabase auth id, not public.users.id) and organisation_id = an account the caller has
// access to, plus the opa.create permission — all must be the *copying* user/account, not
// whatever the source master row happened to carry.
async function duplicateOpaRow(db, sourceId, accountId, nameSuffix = ' (custom)') {
  const { data: src, error } = await db
    .from('organisational_process_assets')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle()
  if (error) throw error
  if (!src) throw new Error('organisational_process_assets row not found')
  const {
    data: { user: authUser },
  } = await db.auth.getUser()
  if (!authUser?.id) throw new Error('Not authenticated')
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    pm_template_node_id: _n,
    created_by: _cb,
    organisation_id: _org,
    ...rest
  } = src
  const { data, error: insErr } = await db
    .from('organisational_process_assets')
    .insert({
      ...rest,
      name: withCustomNameSuffix(rest.name, 'OPA'),
      pm_template_node_id: null,
      created_by: authUser.id,
      organisation_id: accountId,
    })
    .select()
    .single()
  if (insErr) throw insErr
  return data
}

// form_templates RLS (SQL/v754 + v809 + v839) allows two shapes: a global master
// (account_id NULL, PMO-admin-only write) or an account-scoped copy
// (account_id = the org, created_by = the copying user — PMO admin OR the
// creator with account access; v839 unblocks PM "copy down to my project").
// template_code: insert blank and let Admin ID Generation assign FRM-/SFRM-
// via SQL/v854 AFTER INSERT trigger (CLAUDE.md rule 16.2). Re-fetch after
// insert because PostgREST RETURNING may still show '' before the trigger
// update is visible on the returned row.
// The current published version's schema is cloned too, otherwise the copy
// would open as an empty form.
async function refetchFormTemplate(db, id) {
  const { data, error } = await db.from('form_templates').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function duplicateFormTemplateRow(db, sourceId, accountId, nameSuffix = ' (custom)') {
  const { data: src, error } = await db
    .from('form_templates')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle()
  if (error) throw error
  if (!src) throw new Error('form_templates row not found')

  const {
    data: { user: authUser },
  } = await db.auth.getUser()
  if (!authUser?.id) throw new Error('Not authenticated')

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    template_code: _tc,
    account_id: _a,
    created_by: _cb,
    pm_template_node_id: _n,
    ...rest
  } = src

  const { data: inserted, error: insErr } = await db
    .from('form_templates')
    .insert({
      ...rest,
      template_code: '',
      name: withCustomNameSuffix(rest.name, 'Form template'),
      account_id: accountId,
      created_by: authUser.id,
      pm_template_node_id: null,
    })
    .select()
    .single()
  if (insErr) throw insErr

  const data = (await refetchFormTemplate(db, inserted.id)) || inserted

  const { data: currentVersion } = await db
    .from('form_template_versions')
    .select('schema')
    .eq('template_id', src.id)
    .eq('is_current', true)
    .maybeSingle()

  const { error: verErr } = await db
    .from('form_template_versions')
    .insert({
      template_id: data.id,
      version_number: 1,
      schema: currentVersion?.schema ?? {},
      is_current: true,
    })
  if (verErr) throw verErr

  return data
}

/**
 * Create a blank-origin local form (no source to copy): empty schema v1 +
 * pm_template_nodes with parent_node_id NULL (PRD D1 / Phase 3.1).
 *
 * @param {object} db
 * @param {object} opts
 * @param {string} opts.accountId
 * @param {string} [opts.tier='project']
 * @param {string} [opts.scopeEntityType='project']
 * @param {string|null} [opts.scopeEntityId]
 * @param {string} opts.name
 * @param {string|null} [opts.userId]
 * @param {string} [opts.processGroup='planning']
 */
export async function createBlankFormTemplateNode(db, {
  accountId,
  tier = 'project',
  scopeEntityType = 'project',
  scopeEntityId = null,
  name,
  userId = null,
  processGroup = 'planning',
} = {}) {
  if (!db) throw new Error('db is required')
  if (!accountId) throw new Error('accountId is required')
  const formName = String(name || '').trim()
  if (!formName) throw new Error('name is required')
  if (tier !== 'pmo' && !scopeEntityId) {
    throw new Error('scopeEntityId is required for non-PMO tiers')
  }

  const {
    data: { user: authUser },
  } = await db.auth.getUser()
  if (!authUser?.id) throw new Error('Not authenticated')

  const { data: inserted, error: insErr } = await db
    .from('form_templates')
    .insert({
      template_code: '',
      name: formName,
      process_group: processGroup || 'planning',
      is_active: true,
      account_id: accountId,
      created_by: authUser.id,
      pm_template_node_id: null,
    })
    .select()
    .single()
  if (insErr) throw insErr

  const formRow = (await refetchFormTemplate(db, inserted.id)) || inserted

  const { error: verErr } = await db
    .from('form_template_versions')
    .insert({
      template_id: formRow.id,
      version_number: 1,
      schema: { sections: [] },
      is_current: true,
    })
  if (verErr) throw verErr

  const node = await createTierDocumentTemplateNode(db, {
    accountId,
    tier,
    domain: 'form_template',
    scopeEntityType: tier === 'pmo' ? 'account' : scopeEntityType,
    scopeEntityId: tier === 'pmo' ? null : scopeEntityId,
    name: formName,
    parentNodeId: null,
    domainRefId: formRow.id,
    userId: userId || null,
  })

  await db
    .from('form_templates')
    .update({ pm_template_node_id: node.id, updated_at: new Date().toISOString() })
    .eq('id', formRow.id)

  if (scopeEntityType && scopeEntityType !== 'account' && scopeEntityId) {
    await getOrCreateEntityAssignment(db, {
      accountId,
      entityType: scopeEntityType,
      entityId: scopeEntityId,
      domain: 'form_template',
      nodeId: node.id,
    })
  }

  return { node, formTemplate: { ...formRow, pm_template_node_id: node.id } }
}

/**
 * @param {object} db
 * @param {object} opts
 * @param {string} opts.accountId
 * @param {string} opts.sourceNodeId
 * @param {string} [opts.tier='pmo']
 * @param {string} [opts.scopeEntityType='account']
 * @param {string|null} [opts.scopeEntityId]
 * @param {string|null} [opts.userId]
 */
export async function copyTemplateNodeForAccount(db, {
  accountId,
  sourceNodeId,
  tier = 'pmo',
  scopeEntityType = 'account',
  scopeEntityId = null,
  userId = null,
} = {}) {
  if (!db) throw new Error('db is required')
  if (!accountId) throw new Error('accountId is required')
  if (!sourceNodeId) throw new Error('sourceNodeId is required')

  const source = await getTemplateNode(db, sourceNodeId)
  if (!source) throw new Error('Source template node not found')
  // Copying is normally global-master-only, but forking your OWN existing organisational
  // template into a narrower scope (e.g. the org's PMO-tier customisation → a specific
  // project) must also be allowed — that's exactly how downstream tiers end up inheriting
  // the org's version instead of the raw Global one (v805 Phase 4).
  const isOwnOrgTemplate = !source.is_system_synced && source.account_id === accountId
  if (!source.is_system_synced && !isOwnOrgTemplate) {
    throw new Error('Only system-synced (global) templates, or your own organisational templates, can be copied for customisation')
  }
  if (!COPYABLE_DOMAINS.has(source.domain)) {
    throw new Error(`Copy not supported for domain: ${source.domain}`)
  }

  // v822: at most one current copy of a given source node per account/tier/scope. Checked
  // here (before duplicating anything, e.g. form_templates/process_template/opa rows) rather
  // than relying solely on the DB unique index — each copy duplicates its underlying document
  // into a fresh row with its own id, so a DB constraint keyed on that document id can never
  // catch a re-copy of the same source; parent_node_id is the only stable identity to check.
  let existingScopeQuery = db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('tier', tier)
    .eq('scope_entity_type', scopeEntityType)
    .eq('parent_node_id', sourceNodeId)
    .eq('is_current', true)
  existingScopeQuery = scopeEntityId
    ? existingScopeQuery.eq('scope_entity_id', scopeEntityId)
    : existingScopeQuery.is('scope_entity_id', null)
  const { data: existingCopy, error: existingErr } = await existingScopeQuery.maybeSingle()
  if (existingErr) throw existingErr
  if (existingCopy) {
    const err = new Error(`This template has already been copied for this ${tier === 'pmo' ? 'organisation' : tier}`)
    err.code = 'ALREADY_COPIED'
    err.existingNode = existingCopy
    throw err
  }

  let domainRefId = null
  let processTemplateTable = null
  if (source.domain === 'opa' && source.domain_ref_id) {
    const dup = await duplicateOpaRow(db, source.domain_ref_id, accountId)
    domainRefId = dup.id
  } else if (source.domain === 'process_template' && source.domain_ref_id) {
    const projectId = scopeEntityType === 'project' ? scopeEntityId : null
    const dup = await duplicateProcessTemplateRow(db, source.domain_ref_id, { accountId, projectId })
    domainRefId = dup.id
    processTemplateTable = dup.__table
  } else if (source.domain === 'form_template' && source.domain_ref_id) {
    const dup = await duplicateFormTemplateRow(db, source.domain_ref_id, accountId)
    domainRefId = dup.id
  } else if (['portfolio_template', 'programme_template', 'project_template'].includes(source.domain)) {
    // No payload column or catalog row exists for these domains (SQL/v785 sets
    // domain_ref_id to NULL when syncing them) — fork the node only, nothing to duplicate.
    domainRefId = null
  }

  // Org copies already end in "(custom)"; project copy-down must not stack another.
  const copyName =
    tier === 'project' && source.domain === 'process_template'
      ? toProjectDocumentLabel(source.name) || 'Document'
      : withCustomNameSuffix(source.name, 'Custom template')
  let node
  if (source.domain === 'fields' && tier === 'pmo' && scopeEntityType === 'account') {
    node = await createPmoFieldTemplateNode(db, {
      accountId,
      name: copyName,
      description: source.description,
      category: source.category,
      parentNodeId: source.id,
      userId,
    })
  } else {
    node = await createTierDocumentTemplateNode(db, {
      accountId,
      tier,
      domain: source.domain,
      scopeEntityType,
      scopeEntityId,
      name: copyName,
      description: source.description,
      category: source.category,
      parentNodeId: source.id,
      domainRefId,
      userId,
    })
  }

  if (source.methodology) {
    await db
      .from('pm_template_nodes')
      .update({ methodology: source.methodology, updated_at: new Date().toISOString() })
      .eq('id', node.id)
    node = { ...node, methodology: source.methodology }
  }

  if (source.domain === 'fields') {
    const links = await listFieldLinksForNode(db, source.id)
    for (const link of links) {
      await upsertFieldLink(db, {
        node_id: node.id,
        custom_field_definition_id: link.custom_field_definition_id,
        display_order: link.display_order ?? 0,
        is_required: link.is_required ?? false,
        is_local: true,
        guidance_override: link.guidance_override ?? null,
        default_value: link.default_value ?? null,
      })
    }
  }

  if (domainRefId && source.domain === 'opa') {
    try {
      await db
        .from('organisational_process_assets')
        .update({ pm_template_node_id: node.id, updated_at: new Date().toISOString() })
        .eq('id', domainRefId)
    } catch {
      /* column may not exist on older schemas */
    }
  }
  if (domainRefId && source.domain === 'process_template' && processTemplateTable) {
    const { error: linkErr } = await db
      .from('process_template_node_links')
      .insert({ document_table: processTemplateTable, document_id: domainRefId, node_id: node.id })
    if (linkErr) throw linkErr
  }
  if (domainRefId && source.domain === 'form_template') {
    await db
      .from('form_templates')
      .update({ pm_template_node_id: node.id, updated_at: new Date().toISOString() })
      .eq('id', domainRefId)
  }

  if (scopeEntityType && scopeEntityType !== 'account' && scopeEntityId) {
    await getOrCreateEntityAssignment(db, {
      accountId,
      entityType: scopeEntityType,
      entityId: scopeEntityId,
      domain: source.domain,
      nodeId: node.id,
    })
  }

  return { node, source }
}

/** @deprecated alias — prefer copyTemplateNodeForAccount */
export async function copyFieldTemplateNodeForAccount(db, opts) {
  return copyTemplateNodeForAccount(db, { ...opts, /* domain enforced via source */ })
}
