/**
 * My Work aggregation service (v982 Phase 7 follow-up — My Work zone's fuller vision)
 * Cross-project "assigned to me" signals. Deliberately starts with what's cheap and already
 * unified: the existing `raid_log` VIEW (SQL/v26_risk_management.sql) already combines risks,
 * assumptions, issues, and dependencies with one common `owner_user_id` column across every
 * project — exactly the aggregation this page needs, with zero new schema. RLS on the underlying
 * risks/assumptions/issues/dependencies_register tables governs what this query can see, same as
 * any other read.
 *
 * NOT covered by this pass (documented, not silently declared complete): governance actions
 * (getGovernanceActions() is project-scoped only, no cross-project "assigned to me" query exists
 * for it yet) and task assignments (no unified "my tasks across every project" view/query was
 * found — the tasks table's own assignment model would need its own investigation before being
 * added here safely).
 */
import { platformDb } from '@nidus/supabase'

const OPEN_STATUS_BY_TYPE = {
  risk: ['identified', 'assessed', 'mitigated', 'monitored'],
  issue: ['new', 'assigned', 'in_progress', 'reopened'],
  assumption: ['unvalidated', 'validated'],
  dependency: ['identified', 'in_progress', 'at_risk'],
}

/**
 * RAID items (risks/assumptions/issues/dependencies) owned by this user, across every project
 * they can see, not yet in a closed/resolved state for their own type.
 * @param {string} internalUserId - public.users.id
 * @param {number} [limit]
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getMyOpenRaidItems(internalUserId, limit = 10) {
  try {
    if (!internalUserId) return { success: true, data: [], error: null }

    // raid_log is a VIEW (SQL/v26_risk_management.sql — a UNION of risks/assumptions/issues/
    // dependencies_register), not a base table, so it carries no foreign key constraints for
    // PostgREST to auto-detect — a `projects:project_id (...)` embed always fails with PGRST200
    // ("Could not find a relationship"). Fetch plain, then resolve project names separately.
    const { data, error } = await platformDb
      .from('raid_log')
      .select('raid_type, id, project_id, code, title, status, priority_level, created_at')
      .eq('owner_user_id', internalUserId)
      .order('created_at', { ascending: false })
      .limit(200) // fetch a bounded window, filter open-status client-side (mixed vocab per type)

    if (error) throw error

    const open = (data || []).filter((row) => {
      const openStatuses = OPEN_STATUS_BY_TYPE[row.raid_type]
      return !openStatuses || openStatuses.includes(row.status)
    }).slice(0, limit)

    const projectIds = [...new Set(open.map((row) => row.project_id).filter(Boolean))]
    let projectById = new Map()
    if (projectIds.length > 0) {
      const { data: projectRows, error: projectError } = await platformDb
        .from('projects')
        .select('id, project_name, project_code')
        .in('id', projectIds)
      if (!projectError && projectRows) {
        projectById = new Map(projectRows.map((p) => [p.id, p]))
      }
    }
    const enriched = open.map((row) => ({
      ...row,
      projects: projectById.get(row.project_id) || null,
    }))

    return { success: true, data: enriched, error: null }
  } catch (error) {
    console.error('getMyOpenRaidItems:', error)
    return { success: false, data: [], error: error.message || 'Failed to load your RAID items' }
  }
}
