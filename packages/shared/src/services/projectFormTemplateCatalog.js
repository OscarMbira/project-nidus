import {
  filterProjectOwnTemplateNodes,
  resolveNearestTierPerFamily,
  resolveProjectTierAncestry,
} from './pmTemplateInheritanceService.js'
import { listTemplateLibraryNodes } from './pmTemplateLibraryService.js'

/**
 * Form templates that appear under Project Templates for this project
 * (project-tier pm_template_nodes with domain = form_template + their form_templates rows).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ accountId: string, projectId: string }} opts
 * @returns {Promise<Array<{ id: string, name: string, template_code: string }>>}
 */
export async function listProjectCopiedFormTemplates(db, { accountId, projectId } = {}) {
  if (!db || !accountId || !projectId) return []

  const nodes = await listTemplateLibraryNodes(db, accountId, {
    domains: ['form_template'],
    isSystemSynced: false,
  })
  const projectNodes = filterProjectOwnTemplateNodes(nodes, projectId)
  const refIds = [...new Set(projectNodes.map((n) => n.domain_ref_id).filter(Boolean))]
  if (!refIds.length) return []

  const { data, error } = await db
    .from('form_templates')
    .select('id, name, template_code')
    .in('id', refIds)
    .order('name')
  if (error) throw error

  // Keep dropdown labels aligned with Project Templates node names when present.
  const nameByRef = new Map(projectNodes.map((n) => [n.domain_ref_id, n.name]))
  return (data || []).map((t) => ({
    id: t.id,
    template_code: t.template_code,
    name: nameByRef.get(t.id) || t.name,
  }))
}

/**
 * Deduped form-template catalog for FormsGallery (v852 D6): nearest-tier org/local
 * copies for the project, plus global masters (account_id IS NULL) that have not been
 * overridden by a nearer copy in the same family.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{
 *   accountId: string,
 *   projectId: string,
 *   programmeId?: string|null,
 *   portfolioId?: string|null,
 *   schema?: 'public'|'sim',
 * }} opts
 * @returns {Promise<object[]>} form_templates rows (full select *)
 */
export async function listNearestFormTemplatesForProject(
  db,
  {
    accountId,
    projectId,
    programmeId = null,
    portfolioId = null,
    schema = 'public',
  } = {},
) {
  if (!db || !accountId || !projectId) return []

  let progId = programmeId
  let portId = portfolioId
  if (progId == null && portId == null) {
    const ancestry = await resolveProjectTierAncestry(db, projectId, { schema })
    progId = ancestry.programmeId
    portId = ancestry.portfolioId
  }

  const orgNodes = await listTemplateLibraryNodes(db, accountId, {
    domains: ['form_template'],
    isSystemSynced: false,
  })
  const nearest = resolveNearestTierPerFamily(orgNodes, {
    projectId,
    programmeId: progId,
    portfolioId: portId,
  })
  const nearestRefIds = [...new Set(nearest.map((n) => n.domain_ref_id).filter(Boolean))]

  const byId = new Map(orgNodes.map((n) => [n.id, n]))
  const externalParentIds = new Set()
  for (const row of nearest) {
    let current = row
    const seen = new Set()
    while (current?.parent_node_id && byId.has(current.parent_node_id) && !seen.has(current.id)) {
      seen.add(current.id)
      current = byId.get(current.parent_node_id)
    }
    if (current?.parent_node_id && !byId.has(current.parent_node_id)) {
      externalParentIds.add(current.parent_node_id)
    }
  }

  const overriddenGlobalFormIds = new Set()
  if (externalParentIds.size) {
    const { data: parents, error: parentErr } = await db
      .from('pm_template_nodes')
      .select('id, domain_ref_id')
      .in('id', [...externalParentIds])
    if (parentErr) throw parentErr
    for (const p of parents || []) {
      if (p.domain_ref_id) overriddenGlobalFormIds.add(p.domain_ref_id)
    }
  }

  const { data: globals, error: globalErr } = await db
    .from('form_templates')
    .select('*')
    .is('account_id', null)
    .eq('is_active', true)
    .order('name')
  if (globalErr) throw globalErr

  let nearestForms = []
  if (nearestRefIds.length) {
    const { data, error } = await db.from('form_templates').select('*').in('id', nearestRefIds)
    if (error) throw error
    nearestForms = data || []
  }

  const nameByRef = new Map(nearest.map((n) => [n.domain_ref_id, n.name]))
  const nearestMapped = nearestForms.map((t) => ({
    ...t,
    name: nameByRef.get(t.id) || t.name,
  }))

  const globalKept = (globals || []).filter((g) => !overriddenGlobalFormIds.has(g.id))
  const nearestIds = new Set(nearestMapped.map((t) => t.id))
  const merged = [...nearestMapped, ...globalKept.filter((g) => !nearestIds.has(g.id))]
  merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  return merged
}
