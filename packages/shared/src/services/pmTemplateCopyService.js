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
    account_id: _a,
    ...rest
  } = src
  const { data, error: insErr } = await db
    .from(table)
    .insert({
      ...rest,
      title: `${rest.title || 'Process document'}${nameSuffix}`,
      is_master: false,
      project_id: projectId || null,
      account_id: accountId,
    })
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
      name: `${rest.name || 'OPA'}${nameSuffix}`,
      pm_template_node_id: null,
      created_by: authUser.id,
      organisation_id: accountId,
    })
    .select()
    .single()
  if (insErr) throw insErr
  return data
}

// form_templates RLS (SQL/v754 + v809) allows two shapes: a global master
// (account_id NULL, PMO-admin-only write) or an account-level PMO customisation
// (account_id = the org, created_by = the copying user, still PMO-admin gated) —
// same account-copy shape as opa/process_template. template_code is unique, so
// the copy needs a fresh one (reusing formEngineService.js's own "next F0xx"
// convention rather than importing it — that file lives in apps/platform, which
// packages/shared can't import from). The current published version's schema is
// cloned too, otherwise the copy would open as an empty form.
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

  const { data: existingCodes, error: codesErr } = await db
    .from('form_templates')
    .select('template_code')
  if (codesErr) throw codesErr
  const maxNum = (existingCodes || []).reduce((max, row) => {
    const match = String(row.template_code || '').trim().match(/^F(\d+)$/i)
    const n = match ? Number(match[1]) : null
    return n != null && n > max ? n : max
  }, 0)
  const newCode = `F${String(maxNum + 1).padStart(3, '0')}`

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

  const { data, error: insErr } = await db
    .from('form_templates')
    .insert({
      ...rest,
      template_code: newCode,
      name: `${rest.name || 'Form template'}${nameSuffix}`,
      account_id: accountId,
      created_by: authUser.id,
      pm_template_node_id: null,
    })
    .select()
    .single()
  if (insErr) throw insErr

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

  const copyName = `${source.name} (custom)`
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
