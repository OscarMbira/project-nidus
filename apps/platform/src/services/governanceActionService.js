/**
 * Unified Governance Action Register — Platform (public schema)
 *
 * Read-only cross-domain rollup of pending/resolved/cancelled actions arising from Quality
 * activities, Issues, and Lessons, sourced from public.unified_governance_actions_v (see
 * SQL/v966z_phase12_governance_actions_view.sql for the schema investigation and design
 * rationale).
 *
 * This service intentionally exposes NO create/complete/cancel actions — those stay on each
 * domain's own existing "My Actions" page. buildActionViewPath() maps a row back to that page.
 *
 * @see projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 12
 */

import { platformDb } from '@nidus/supabase'

const ACTION_TYPE_LABELS = {
  quality: 'Quality',
  issue: 'Issue',
  lesson: 'Lesson',
}

export const GOVERNANCE_ACTION_TYPES = Object.keys(ACTION_TYPE_LABELS)
export const GOVERNANCE_ACTION_STATUSES = ['pending', 'resolved', 'cancelled']

export function getActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType
}

/**
 * Builds the URL to the action's OWN domain "My Actions" page. This register is a read-only
 * rollup — completing/cancelling an action always happens on its own domain's page.
 * @param {{ action_type: string }} row
 * @returns {string|null}
 */
export function buildActionViewPath(row) {
  if (!row) return null
  switch (row.action_type) {
    case 'quality':
      return '/platform/my-quality-actions'
    case 'issue':
      return '/platform/issues/my-actions'
    case 'lesson':
      return '/platform/lessons/my-actions'
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
 * Fetch the unified governance actions rollup, optionally filtered by type / status / project /
 * search.
 * @param {{ actionType?: string, status?: string, projectId?: string, search?: string,
 *   limit?: number }} [options]
 */
export async function getGovernanceActions({ actionType, status, projectId, search, limit } = {}) {
  let query = platformDb.from('unified_governance_actions_v').select('*')

  if (actionType) query = query.eq('action_type', actionType)
  if (status) query = query.eq('status', status)
  if (projectId) query = query.eq('project_id', projectId)

  query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)

  const { data, error } = await query
  if (error) throw error

  let rows = data || []

  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter((r) => (r.record_label || '').toLowerCase().includes(q))
  }

  const nameById = await resolveUserNames(rows.flatMap((r) => [r.assigned_to, r.created_by]))

  return rows.map((r) => ({
    ...r,
    action_type_label: getActionTypeLabel(r.action_type),
    assigned_to_name: r.assigned_to ? nameById[r.assigned_to] || null : null,
    created_by_name: r.created_by ? nameById[r.created_by] || null : null,
    view_path: buildActionViewPath(r),
  }))
}

export default {
  getGovernanceActions,
  buildActionViewPath,
  getActionTypeLabel,
  GOVERNANCE_ACTION_TYPES,
  GOVERNANCE_ACTION_STATUSES,
}
