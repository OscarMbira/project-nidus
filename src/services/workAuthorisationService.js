/**
 * Work Authorisation Service — Platform (public schema)
 */

import { platformDb } from './supabase/supabaseClient'
import { logAction } from './pmoAuditService'

export async function resolveUserId() {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb
    .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

/**
 * @param {object} filters
 * @param {string} [filters.projectId]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 */
export async function listWorkAuthorisations(filters = {}) {
  try {
    let q = platformDb
      .from('work_authorisations')
      .select(`
        *,
        project:project_id (id, project_name, project_code)
      `)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })

    if (filters.projectId) q = q.eq('project_id', filters.projectId)
    if (filters.status) q = q.eq('status', filters.status)

    const { data, error } = await q
    if (error) throw error
    let rows = data || []
    if (filters.search) {
      const s = filters.search.trim().toLowerCase()
      rows = rows.filter((r) =>
        (r.title || '').toLowerCase().includes(s) ||
        (r.reference_code || '').toLowerCase().includes(s) ||
        (r.action_type || '').toLowerCase().includes(s)
      )
    }
    return { success: true, data: rows }
  } catch (err) {
    console.error('workAuthorisationService.listWorkAuthorisations', err)
    return { success: false, message: err.message, data: [] }
  }
}

export async function getWorkAuthorisation(id) {
  try {
    const { data, error } = await platformDb
      .from('work_authorisations')
      .select(`
        *,
        project:project_id (id, project_name, project_code),
        requestor:requested_by (id, full_name, email)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('workAuthorisationService.getWorkAuthorisation', err)
    return { success: false, message: err.message, data: null }
  }
}

export async function listHistory(workAuthorisationId) {
  try {
    const { data, error } = await platformDb
      .from('work_authorisation_history')
      .select(`
        *,
        actor:actor_user_id (id, full_name, email)
      `)
      .eq('work_authorisation_id', workAuthorisationId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err) {
    console.error('workAuthorisationService.listHistory', err)
    return { success: false, message: err.message, data: [] }
  }
}

export async function createDraft(payload) {
  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated' }

    const { data, error } = await platformDb
      .from('work_authorisations')
      .insert({
        project_id: payload.project_id,
        action_type: payload.action_type,
        target_entity_type: payload.target_entity_type || null,
        target_entity_id: payload.target_entity_id || null,
        title: payload.title,
        rationale: payload.rationale || null,
        risk_impact_summary: payload.risk_impact_summary || null,
        planned_start_date: payload.planned_start_date || null,
        planned_end_date: payload.planned_end_date || null,
        primary_approver_user_id: payload.primary_approver_user_id || null,
        status: 'draft',
        requested_by: userId,
        created_by: userId,
        updated_by: userId,
        metadata: payload.metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    await logAction(userId, 'WORK_AUTH_CREATE_DRAFT', 'WORK_AUTHORISATION', data.id,
      `Created draft work authorisation ${data.reference_code}`, { reference_code: data.reference_code })

    return { success: true, data }
  } catch (err) {
    console.error('workAuthorisationService.createDraft', err)
    return { success: false, message: err.message }
  }
}

export async function updateDraft(id, payload) {
  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated' }

    const { data, error } = await platformDb
      .from('work_authorisations')
      .update({
        project_id: payload.project_id,
        action_type: payload.action_type,
        target_entity_type: payload.target_entity_type || null,
        target_entity_id: payload.target_entity_id || null,
        title: payload.title,
        rationale: payload.rationale || null,
        risk_impact_summary: payload.risk_impact_summary || null,
        planned_start_date: payload.planned_start_date || null,
        planned_end_date: payload.planned_end_date || null,
        primary_approver_user_id: payload.primary_approver_user_id || null,
        metadata: payload.metadata || {},
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('workAuthorisationService.updateDraft', err)
    return { success: false, message: err.message }
  }
}

export async function transition(workAuthorisationId, action, notes = null) {
  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated' }

    const { data, error } = await platformDb.rpc('work_authorisation_transition', {
      p_work_authorisation_id: workAuthorisationId,
      p_action: action,
      p_notes: notes,
    })

    if (error) throw error
    if (!data?.success) {
      return { success: false, message: data?.error || 'Transition failed' }
    }

    const { data: row } = await platformDb
      .from('work_authorisations')
      .select('id, reference_code, project_id, title, status, primary_approver_user_id, requested_by')
      .eq('id', workAuthorisationId)
      .single()

    await logAction(userId, `WORK_AUTH_${String(action).toUpperCase()}`, 'WORK_AUTHORISATION', workAuthorisationId,
      `Work authorisation ${row?.reference_code}: ${action}`, { action, notes })

    await notifyWorkAuthorisationEvent(row, action, userId)

    return { success: true, data }
  } catch (err) {
    console.error('workAuthorisationService.transition', err)
    return { success: false, message: err.message }
  }
}

async function notifyWorkAuthorisationEvent(row, action, actorUserId) {
  if (!row?.project_id) return
  try {
    const { data: project } = await platformDb
      .from('projects')
      .select('project_name, project_manager_user_id')
      .eq('id', row.project_id)
      .maybeSingle()

    const targets = new Set()
    if (project?.project_manager_user_id) targets.add(project.project_manager_user_id)
    if (row.primary_approver_user_id) targets.add(row.primary_approver_user_id)
    if (row.requested_by) targets.add(row.requested_by)

    const title = `Work authorisation ${row.reference_code || ''}`
    const message = `${String(action)} — ${row.title || ''} (${project?.project_name || 'Project'})`

    const rows = Array.from(targets)
      .filter((uid) => uid && uid !== actorUserId)
      .map((uid) => ({
        user_id: uid,
        notification_type: 'work_authorisation',
        notification_category: 'project',
        title,
        message,
        related_entity_type: 'work_authorisation',
        related_entity_id: row.id,
        delivery_method: 'in_app',
        is_read: false,
        action_url: `/platform/work-authorisations/${row.id}`,
        action_label: 'View',
      }))

    if (rows.length === 0) return
    await platformDb.from('notifications').insert(rows)
  } catch (e) {
    console.warn('workAuthorisationService.notifyWorkAuthorisationEvent', e)
  }
}

export async function fetchProjectsForUser() {
  try {
    const userId = await resolveUserId()
    if (!userId) return []

    const { data: memberships } = await platformDb
      .from('project_memberships')
      .select('project_id')
      .eq('user_id', userId)
      .eq('is_active', true)

    const ids = (memberships || []).map((m) => m.project_id).filter(Boolean)
    if (ids.length === 0) return []

    const { data: projects, error } = await platformDb
      .from('projects')
      .select('id, project_name, project_code')
      .in('id', ids)
      .eq('is_deleted', false)
      .order('project_name')

    if (error) throw error
    return projects || []
  } catch (err) {
    console.error('workAuthorisationService.fetchProjectsForUser', err)
    return []
  }
}

export async function listApproversForProject(projectId) {
  if (!projectId) return []
  try {
    const { data, error } = await platformDb
      .from('project_memberships')
      .select('users:users!project_memberships_user_id_fkey (id, full_name, email)')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .limit(200)
    if (error) throw error
    return (data || []).map((r) => r.users).filter(Boolean)
  } catch (err) {
    console.error('workAuthorisationService.listApproversForProject', err)
    return []
  }
}

export function hasApprovedActionForLifecycle(projectId, actionType) {
  return platformDb.rpc('work_authorisation_has_approved_action', {
    p_project_id: projectId,
    p_action_type: actionType,
  }).then(({ data, error }) => {
    if (error) return { success: false, data: false }
    return { success: true, data: data === true }
  })
}
