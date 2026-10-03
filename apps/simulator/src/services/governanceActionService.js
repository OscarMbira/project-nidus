/**
 * Unified Governance Action Register — Simulator (sim schema)
 *
 * Read-only cross-domain rollup sourced from sim.unified_governance_actions_v (see
 * SQL/v966aa_phase12_sim_governance_actions_view.sql for why sim.practice_issue_actions +
 * sim.practice_lesson_entries — not a mirror of Platform's 3 source tables, which don't exist
 * unmodified in the sim schema — are the source, and why Quality is omitted).
 *
 * This service intentionally exposes NO create/complete/cancel actions — those stay on each
 * domain's own existing practice page. buildActionViewPath() maps a row back to that page.
 *
 * @see projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 12
 */

import { simDb } from '@nidus/supabase'

const ACTION_TYPE_LABELS = {
  issue: 'Issue',
  lesson: 'Lesson',
}

export const GOVERNANCE_ACTION_TYPES = Object.keys(ACTION_TYPE_LABELS)
export const GOVERNANCE_ACTION_STATUSES = ['pending', 'resolved', 'cancelled']

export function getActionTypeLabel(actionType) {
  return ACTION_TYPE_LABELS[actionType] || actionType
}

/**
 * Builds the URL to the action's OWN domain practice page. This register is a read-only rollup —
 * resolving/cancelling an action always happens on its own domain's page.
 * @param {{ action_type: string, parent_id?: string }} row
 * @returns {string|null}
 */
export function buildActionViewPath(row) {
  if (!row) return null
  switch (row.action_type) {
    case 'issue':
      return row.parent_id ? `/simulator/practice-issue-register/${row.parent_id}` : '/simulator/practice-issue-register'
    case 'lesson':
      return row.parent_id ? `/simulator/practice-lessons-log/${row.parent_id}` : '/simulator/practice-lessons-log'
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
 * Fetch the unified governance actions rollup, optionally filtered by type / status / project /
 * search.
 * @param {{ actionType?: string, status?: string, projectId?: string, search?: string,
 *   limit?: number }} [options]
 */
export async function getGovernanceActions({ actionType, status, projectId, search, limit } = {}) {
  let query = simDb.from('unified_governance_actions_v').select('*')

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
