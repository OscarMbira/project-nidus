/**
 * Read/update the underlying domain content for an account-owned pm_template_nodes row,
 * for the Organisational Templates detail/edit page. Mirrors the table-finding logic in
 * pmTemplateCopyService.js (kept separate to avoid entangling copy vs. edit concerns).
 *
 * Note on portfolio_template/programme_template/project_template: despite forkable via
 * copyTemplateNodeForAccount, these domains have no payload column on pm_template_nodes
 * and no domain_ref catalog row (SQL/v785's sync sets domain_ref_id to NULL for them) —
 * there is genuinely no richer content to read/edit beyond the node's own name/description/
 * category. Editing those three fields (via updateTemplateNode) is everything available.
 */

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

async function findProcessTemplateTable(db, domainRefId) {
  const { data } = await db
    .from('process_template_node_links')
    .select('document_table')
    .eq('document_id', domainRefId)
    .maybeSingle()
  if (data?.document_table) return data.document_table
  const hits = await Promise.all(
    PROCESS_TEMPLATE_TABLES.map((table) =>
      db.from(table).select('id').eq('id', domainRefId).maybeSingle()
        .then(({ data: d }) => (d ? table : null))
        .catch(() => null),
    ),
  )
  return hits.find(Boolean) || null
}

/**
 * @param {object} db
 * @param {object} node - a pm_template_nodes row
 * @returns {Promise<{ kind: string, table?: string, content: object|null }>}
 */
export async function getNodeContent(db, node) {
  if (!node) return { kind: 'none', content: null }
  if (node.domain === 'opa' && node.domain_ref_id) {
    const { data, error } = await db
      .from('organisational_process_assets')
      .select('*')
      .eq('id', node.domain_ref_id)
      .maybeSingle()
    if (error) throw error
    return { kind: 'opa', content: data || null }
  }
  if (node.domain === 'process_template' && node.domain_ref_id) {
    const table = await findProcessTemplateTable(db, node.domain_ref_id)
    if (!table) return { kind: 'process_template', content: null }
    const { data, error } = await db.from(table).select('*').eq('id', node.domain_ref_id).maybeSingle()
    if (error) throw error
    return { kind: 'process_template', table, content: data || null }
  }
  if (['portfolio_template', 'programme_template', 'project_template'].includes(node.domain)) {
    // No payload column/catalog row exists for these domains (see file header) —
    // the node's own name/description/category is the entire editable surface.
    return { kind: 'level_template', content: null }
  }
  if (node.domain === 'form_template' && node.domain_ref_id) {
    const { data: template, error } = await db
      .from('form_templates')
      .select('*')
      .eq('id', node.domain_ref_id)
      .maybeSingle()
    if (error) throw error
    if (!template) return { kind: 'form_template', content: null }
    const { data: version, error: verErr } = await db
      .from('form_template_versions')
      .select('schema')
      .eq('template_id', template.id)
      .eq('is_current', true)
      .maybeSingle()
    if (verErr) throw verErr
    return { kind: 'form_template', content: { ...template, schema: version?.schema || null } }
  }
  return { kind: node.domain, content: null }
}

/** Update the process_template catalog row's title/description/document_data in place. */
export async function updateProcessTemplateContent(db, table, id, { title, description, documentData } = {}) {
  const patch = { updated_at: new Date().toISOString() }
  if (title !== undefined) patch.title = title
  if (description !== undefined) patch.description = description
  if (documentData !== undefined) patch.document_data = documentData
  try {
    const { data: { user } } = await db.auth.getUser()
    if (user?.id) patch.updated_by = user.id
  } catch {
    // leave updated_by unset when auth is unavailable (tests / service role)
  }
  const { data, error } = await db.from(table).update(patch).eq('id', id).select().maybeSingle()
  if (error) throw error
  return data
}

/** Update the opa row's name/description in place. */
export async function updateOpaContent(db, id, { name, description } = {}) {
  const patch = { updated_at: new Date().toISOString() }
  if (name !== undefined) patch.name = name
  if (description !== undefined) patch.description = description
  const { data, error } = await db
    .from('organisational_process_assets')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}
