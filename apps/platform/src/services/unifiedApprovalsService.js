/**
 * Unified Approvals register — Platform (public schema)
 *
 * Read-only cross-entity rollup of pending/approved/rejected approvals for Mandates, Change
 * Requests, and Benefits Review Plans, sourced from public.unified_approvals_v (see
 * SQL/v964a_unified_approvals_view.sql for the schema investigation and design rationale).
 *
 * This service intentionally exposes NO approve/reject/write actions — those stay on each
 * entity's own existing page. buildApprovalViewPath() maps a row back to that page.
 *
 * @see projectplan/v963_pmis_core_gap_closure_plan.md Phase 5
 */

import { platformDb } from '@nidus/supabase'

const ENTITY_LABELS = {
  mandate: 'Mandate',
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
      return row.record_id ? `/pmo/mandates/${row.record_id}/view` : '/pmo/mandates/approvals'
    case 'change_request':
      // No working per-record deep link exists for Change Requests today — ChangeRequests.jsx's
      // own handleView() navigates to a route that isn't registered (pre-existing, out of scope
      // for this register). Link to the live register list instead.
      return '/pmo/registers/changes'
    case 'benefits_review_plan':
      return row.project_id ? `/platform/projects/${row.project_id}/benefits/review-plan` : '/pmo/registers/changes'
    default:
      return null
  }
}

async function resolveUserNames(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await platformDb.from('users').select('id, full_name, email').in('id', ids)
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
  let query = platformDb.from('unified_approvals_v').select('*')

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
