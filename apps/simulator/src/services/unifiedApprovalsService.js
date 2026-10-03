/**
 * Unified Approvals register — Simulator (sim schema)
 *
 * Read-only cross-entity rollup of pending/approved/rejected approvals for the Simulator's
 * "Practice" module (Practice Briefs, Change Requests, Benefits Review Plans), sourced from
 * sim.unified_approvals_v (see SQL/v964b_sim_unified_approvals_view.sql for why the Practice
 * tables — not a sim.mandate_approvals/sim.change_requests/sim.benefits_review_plans mirror,
 * none of which exist — are the source).
 *
 * This service intentionally exposes NO approve/reject/write actions — those stay on each
 * entity's own existing practice page. buildApprovalViewPath() maps a row back to that page.
 *
 * @see projectplan/v963_pmis_core_gap_closure_plan.md Phase 5
 */

import { simDb } from '@nidus/supabase'

const ENTITY_LABELS = {
  mandate: 'Practice Brief',
  change_request: 'Change Request',
  benefits_review_plan: 'Benefits Review Plan',
}

export const APPROVAL_ENTITY_TYPES = Object.keys(ENTITY_LABELS)
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected']

export function getEntityTypeLabel(entityType) {
  return ENTITY_LABELS[entityType] || entityType
}

/**
 * Builds the URL to the entity's OWN existing detail/decision page. This register is a
 * read-only rollup — approve/reject decisions always happen on the entity's own page.
 * @param {{ entity_type: string, record_id?: string, project_id?: string }} row
 * @returns {string|null}
 */
export function buildApprovalViewPath(row) {
  if (!row) return null
  switch (row.entity_type) {
    case 'mandate':
      return row.record_id ? `/simulator/practice-briefs/${row.record_id}` : null
    case 'change_request':
      // No working per-record deep link exists for Change Requests today (same pre-existing
      // gap as Platform's ChangeRequests.jsx) — link to the live register list instead.
      return '/simulator/pmo/registers/changes'
    case 'benefits_review_plan':
      return row.record_id ? `/simulator/practice-benefits-review-plans/${row.record_id}` : null
    default:
      return null
  }
}

async function resolveUserNames(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await simDb.from('users').select('id, full_name, email').in('id', ids)
  if (error || !data) return {}
  const map = {}
  for (const u of data) map[u.id] = u.full_name || u.email || null
  return map
}

/**
 * Fetch the unified approvals rollup, optionally filtered by entity type / status / search.
 * @param {{ entityType?: string, status?: string, search?: string }} [options]
 */
export async function getUnifiedApprovals({ entityType, status, search } = {}) {
  let query = simDb.from('unified_approvals_v').select('*')

  if (entityType) query = query.eq('entity_type', entityType)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('requested_at', { ascending: false })
  if (error) throw error

  let rows = data || []

  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter((r) => (r.record_label || '').toLowerCase().includes(q))
  }

  const nameById = await resolveUserNames(rows.flatMap((r) => [r.requested_by, r.decided_by]))

  return rows.map((r) => ({
    ...r,
    entity_type_label: getEntityTypeLabel(r.entity_type),
    requested_by_name: nameById[r.requested_by] || null,
    decided_by_name: r.decided_by ? nameById[r.decided_by] || null : null,
    view_path: buildApprovalViewPath(r),
  }))
}

export default {
  getUnifiedApprovals,
  buildApprovalViewPath,
  getEntityTypeLabel,
  APPROVAL_ENTITY_TYPES,
  APPROVAL_STATUSES,
}
