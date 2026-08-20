/**
 * Document Oversight (v897) — cross-tier read-only visibility over signed project
 * documents. Portfolio/Programme/PMO look down at documents below them (this file);
 * team_lead/team_member reuse the existing per-project "Project Documents" page instead
 * (see projectDocumentsRegisterService.js) since they only ever need their own project.
 *
 * assigned_user_id on signatory rows always FKs to public.users(id), even under `sim` —
 * see processTemplateSignatoryService.js's buildUserLabelLookup for the same rule.
 */

import { platformDb } from '@nidus/supabase'
import { getCurrentUserInternalUserId } from '../utils/accountResolution.js'
import { slotIsMandatory } from './processTemplateSignatoryService.js'

function ok(data) {
  return { success: true, data }
}
function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

/** Table/column names differ between `public` and `sim` schemas — mirrors the pattern
 * already used by resolveProjectTierAncestry (pmTemplateInheritanceService.js). */
const SCHEMA_TABLES = {
  public: {
    portfolios: 'portfolios',
    portfolioManagerCol: 'portfolio_manager_user_id',
    portfolioProjects: 'portfolio_projects',
    portfolioProjectsPortfolioCol: 'portfolio_id',
    portfolioProjectsProjectCol: 'project_id',
    programmes: 'programmes',
    programmeManagerCol: 'programme_manager_user_id',
    programmeProjects: 'programme_projects',
    programmeProjectsProgrammeCol: 'programme_id',
    programmeProjectsProjectCol: 'project_id',
    projects: 'projects',
  },
  sim: {
    portfolios: 'practice_portfolios',
    portfolioManagerCol: 'portfolio_manager_user_id',
    portfolioProjects: 'practice_portfolio_projects',
    portfolioProjectsPortfolioCol: 'practice_portfolio_id',
    portfolioProjectsProjectCol: 'practice_project_id',
    programmes: 'practice_programmes',
    programmeManagerCol: 'programme_manager_user_id',
    programmeProjects: 'practice_programme_projects',
    programmeProjectsProgrammeCol: 'practice_programme_id',
    programmeProjectsProjectCol: 'practice_project_id',
    projects: 'practice_projects',
  },
}

/**
 * Resolve which project IDs the current user's tier grants them oversight of.
 * PMO is account-wide (scope: 'all'); Portfolio/Programme are their own managed
 * portfolios/programmes only (scope: 'projects').
 * @returns {Promise<{ success: boolean, data?: { scope: 'all'|'projects', projectIds: string[] } }>}
 */
export async function resolveOversightProjectScope(db, { tier, schema = 'public' } = {}) {
  try {
    if (!db || !tier) throw new Error('db and tier are required')
    if (tier === 'pmo') return ok({ scope: 'all', projectIds: [] })

    const t = SCHEMA_TABLES[schema] || SCHEMA_TABLES.public
    // Manager columns FK to public.users(id) under `public`, but to auth.users(id)
    // directly under `sim` — resolve the right identity for the comparison.
    let managerUserId
    if (schema === 'sim') {
      const {
        data: { user: authUser },
      } = await db.auth.getUser()
      managerUserId = authUser?.id || null
    } else {
      managerUserId = await getCurrentUserInternalUserId()
    }
    if (!managerUserId) return ok({ scope: 'projects', projectIds: [] })

    if (tier === 'portfolio') {
      const { data: managed, error: managedErr } = await db
        .from(t.portfolios)
        .select('id')
        .eq(t.portfolioManagerCol, managerUserId)
      if (managedErr) throw managedErr
      const portfolioIds = (managed || []).map((r) => r.id)
      if (!portfolioIds.length) return ok({ scope: 'projects', projectIds: [] })

      const { data: links, error: linksErr } = await db
        .from(t.portfolioProjects)
        .select(t.portfolioProjectsProjectCol)
        .in(t.portfolioProjectsPortfolioCol, portfolioIds)
      if (linksErr) throw linksErr
      const projectIds = [...new Set((links || []).map((r) => r[t.portfolioProjectsProjectCol]).filter(Boolean))]
      return ok({ scope: 'projects', projectIds })
    }

    if (tier === 'programme') {
      const { data: managed, error: managedErr } = await db
        .from(t.programmes)
        .select('id')
        .eq(t.programmeManagerCol, managerUserId)
      if (managedErr) throw managedErr
      const programmeIds = (managed || []).map((r) => r.id)
      if (!programmeIds.length) return ok({ scope: 'projects', projectIds: [] })

      const { data: links, error: linksErr } = await db
        .from(t.programmeProjects)
        .select(t.programmeProjectsProjectCol)
        .in(t.programmeProjectsProgrammeCol, programmeIds)
      if (linksErr) throw linksErr
      const projectIds = [...new Set((links || []).map((r) => r[t.programmeProjectsProjectCol]).filter(Boolean))]
      return ok({ scope: 'projects', projectIds })
    }

    throw new Error(`Unknown tier: ${tier}`)
  } catch (error) {
    return fail(error)
  }
}

/** Aggregate a document's current-round signatory rows into one status. */
function deriveDocumentStatus(slots) {
  if (!slots || slots.length === 0) return 'pending'
  if (slots.some((s) => s.status === 'declined')) return 'declined'
  const mandatory = slots.filter(slotIsMandatory)
  const signedCount = slots.filter((s) => s.status === 'signed').length
  if (mandatory.length > 0 && mandatory.every((s) => s.status === 'signed')) return 'fully_signed'
  if (signedCount > 0) return 'partially_signed'
  return 'pending'
}

/**
 * List project-scoped process_template documents (that have a signatory requirement)
 * within the given project scope, with each document's current signing status and
 * who has signed so far.
 * @param {object} db - platformDb or simDb
 * @param {object} opts
 * @param {string} opts.accountId
 * @param {{ scope: 'all'|'projects', projectIds: string[] }} opts.projectScope
 * @param {'public'|'sim'} [opts.schema]
 */
export async function listOversightDocuments(db, { accountId, projectScope, schema = 'public' } = {}) {
  try {
    if (!db || !accountId || !projectScope) throw new Error('db, accountId, and projectScope are required')
    if (projectScope.scope === 'projects' && projectScope.projectIds.length === 0) {
      return ok([])
    }
    const t = SCHEMA_TABLES[schema] || SCHEMA_TABLES.public

    let nodeQuery = db
      .from('pm_template_nodes')
      .select('id, name, template_reference, scope_entity_id, updated_at')
      .eq('account_id', accountId)
      .eq('domain', 'process_template')
      .eq('scope_entity_type', 'project')
      .eq('is_current', true)
    if (projectScope.scope === 'projects') {
      nodeQuery = nodeQuery.in('scope_entity_id', projectScope.projectIds)
    }
    const { data: nodes, error: nodesErr } = await nodeQuery
    if (nodesErr) throw nodesErr
    if (!nodes || nodes.length === 0) return ok([])

    const nodeIds = nodes.map((n) => n.id)
    const projectIds = [...new Set(nodes.map((n) => n.scope_entity_id).filter(Boolean))]

    const [{ data: signatoryRows, error: sigErr }, { data: projectRows, error: projErr }] = await Promise.all([
      db
        .from('process_template_document_signatories')
        .select('template_node_id, signing_round, slot_order, role_label, status, is_mandatory, assigned_user_id, signed_at')
        .in('template_node_id', nodeIds),
      db.from(t.projects).select('id, project_name').in('id', projectIds),
    ])
    if (sigErr) throw sigErr
    if (projErr) throw projErr

    const projectNameById = new Map((projectRows || []).map((p) => [p.id, p.project_name]))

    // Only the current (max) signing_round per node counts toward status.
    const rowsByNode = new Map()
    for (const row of signatoryRows || []) {
      if (!rowsByNode.has(row.template_node_id)) rowsByNode.set(row.template_node_id, [])
      rowsByNode.get(row.template_node_id).push(row)
    }
    const currentRoundSlotsByNode = new Map()
    const signerIds = new Set()
    for (const [nodeId, rows] of rowsByNode) {
      const maxRound = Math.max(...rows.map((r) => r.signing_round || 1))
      const currentSlots = rows.filter((r) => (r.signing_round || 1) === maxRound)
      currentRoundSlotsByNode.set(nodeId, currentSlots)
      currentSlots.forEach((s) => { if (s.assigned_user_id) signerIds.add(s.assigned_user_id) })
    }

    let signerLabelById = new Map()
    if (signerIds.size > 0) {
      const { data: users } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .in('id', [...signerIds])
      signerLabelById = new Map((users || []).map((u) => [u.id, u.full_name || u.email || '']))
    }

    // Documents with no signatory requirement at all are outside this feature's scope
    // (per PRD: "documents that have a signatory requirement").
    const results = nodes
      .filter((n) => (rowsByNode.get(n.id) || []).length > 0)
      .map((n) => {
        const slots = currentRoundSlotsByNode.get(n.id) || []
        const signedSlots = slots
          .filter((s) => s.status === 'signed')
          .map((s) => ({
            role_label: s.role_label,
            signer_label: s.assigned_user_id ? (signerLabelById.get(s.assigned_user_id) || '') : '',
            signed_at: s.signed_at,
          }))
        return {
          id: n.id,
          name: n.name,
          template_reference: n.template_reference,
          project_id: n.scope_entity_id,
          project_name: projectNameById.get(n.scope_entity_id) || '',
          status: deriveDocumentStatus(slots),
          signed_slots: signedSlots,
          updated_at: n.updated_at,
        }
      })

    return ok(results)
  } catch (error) {
    return fail(error)
  }
}
