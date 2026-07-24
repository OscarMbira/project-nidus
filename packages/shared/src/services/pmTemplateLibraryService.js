/**
 * List pm_template_nodes for the Template Library browse page.
 */

const LIBRARY_DOMAINS = [
  'fields',
  'form_template',
  'opa',
  'process_template',
  'portfolio_template',
  'programme_template',
  'project_template',
  'industry_plan',
  'legacy_document',
  'structured_list',
]

/**
 * @param {object} db
 * @param {string} accountId
 * @param {object} [opts]
 * @param {string[]} [opts.domains]
 * @param {boolean|null} [opts.isSystemSynced] - true = Global Template Library only,
 *   false = Organisational Templates only, null/omitted = both (legacy mixed view).
 */
export async function listTemplateLibraryNodes(db, accountId, { domains = LIBRARY_DOMAINS, isSystemSynced = null } = {}) {
  if (!db || !accountId) return []
  let query = db
    .from('pm_template_nodes')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_current', true)
    .in('domain', domains)
  if (isSystemSynced !== null) query = query.eq('is_system_synced', isSystemSynced)
  const { data, error } = await query
    .order('tier')
    .order('methodology')
    .order('name')
  if (error) throw error
  return data || []
}
