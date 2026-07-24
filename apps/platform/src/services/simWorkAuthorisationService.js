/**
 * Work Authorisation Service — Simulator (sim schema)
 */

import { simDb, platformDb } from './supabase/supabaseClient'

export async function resolveUserId() {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb
    .from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

export async function listWorkAuthorisations(filters = {}) {
  try {
    let q = simDb
      .from('work_authorisations')
      .select(`
        *,
        practice_project:practice_project_id (id, project_name, project_code)
      `)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })

    if (filters.practiceProjectId) q = q.eq('practice_project_id', filters.practiceProjectId)
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
    console.error('simWorkAuthorisationService.listWorkAuthorisations', err)
    return { success: false, message: err.message, data: [] }
  }
}

export async function getWorkAuthorisation(id) {
  try {
    const { data, error } = await simDb
      .from('work_authorisations')
      .select(`
        *,
        practice_project:practice_project_id (id, project_name, project_code),
        requestor:requested_by (id, full_name, email)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('simWorkAuthorisationService.getWorkAuthorisation', err)
    return { success: false, message: err.message, data: null }
  }
}

export async function listHistory(workAuthorisationId) {
  try {
    const { data, error } = await simDb
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
    console.error('simWorkAuthorisationService.listHistory', err)
    return { success: false, message: err.message, data: [] }
  }
}

export async function createDraft(payload) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return { success: false, message: 'Not authenticated' }
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'User profile not found' }

    const { data, error } = await simDb
      .from('work_authorisations')
      .insert({
        practice_project_id: payload.practice_project_id,
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
        user_id: user.id,
        metadata: payload.metadata || {},
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('simWorkAuthorisationService.createDraft', err)
    return { success: false, message: err.message }
  }
}

export async function updateDraft(id, payload) {
  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated' }

    const { data, error } = await simDb
      .from('work_authorisations')
      .update({
        practice_project_id: payload.practice_project_id,
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
    console.error('simWorkAuthorisationService.updateDraft', err)
    return { success: false, message: err.message }
  }
}

export async function transition(workAuthorisationId, action, notes = null) {
  try {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: 'Not authenticated' }

    const { data, error } = await simDb.rpc('work_authorisation_transition', {
      p_work_authorisation_id: workAuthorisationId,
      p_action: action,
      p_notes: notes,
    })

    if (error) throw error
    if (!data?.success) {
      return { success: false, message: data?.error || 'Transition failed' }
    }

    await notifySimWorkAuthorisation(workAuthorisationId, action, userId)

    return { success: true, data }
  } catch (err) {
    console.error('simWorkAuthorisationService.transition', err)
    return { success: false, message: err.message }
  }
}

async function notifySimWorkAuthorisation(workAuthorisationId, action, actorUserId) {
  try {
    const { data: row } = await simDb
      .from('work_authorisations')
      .select('id, reference_code, title, practice_project_id, primary_approver_user_id, requested_by')
      .eq('id', workAuthorisationId)
      .single()

    const { data: pp } = await simDb
      .from('practice_projects')
      .select('project_name, user_id')
      .eq('id', row.practice_project_id)
      .maybeSingle()

    const targets = new Set()
    if (row.primary_approver_user_id) targets.add(row.primary_approver_user_id)
    if (row.requested_by) targets.add(row.requested_by)

    const title = `Practice work authorisation ${row.reference_code || ''}`
    const message = `${String(action)} — ${row.title || ''} (${pp?.project_name || 'Practice project'})`

    const rows = Array.from(targets)
      .filter((uid) => uid && uid !== actorUserId)
      .map((uid) => ({
        user_id: uid,
        notification_type: 'work_authorisation_sim',
        notification_category: 'simulation',
        title,
        message,
        related_entity_type: 'sim_work_authorisation',
        related_entity_id: row.id,
        delivery_method: 'in_app',
        is_read: false,
        action_url: `/simulator/pm/controls/work-authorisations/${row.id}`,
        action_label: 'View',
      }))

    if (rows.length === 0) return
    await platformDb.from('notifications').insert(rows)
  } catch (e) {
    console.warn('simWorkAuthorisationService.notifySimWorkAuthorisation', e)
  }
}

export async function fetchPracticeProjectsForUser() {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return []

    const { data: own, error: e1 } = await simDb
      .from('practice_projects')
      .select('id, project_name, project_code')
      .eq('user_id', user.id)
      .order('project_name')

    if (e1) throw e1

    const { data: mem, error: e2 } = await simDb
      .from('practice_project_memberships')
      .select('practice_project_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (e2) throw e2

    const ids = new Set((own || []).map((p) => p.id))
    const extraIds = (mem || []).map((m) => m.practice_project_id).filter((id) => id && !ids.has(id))
    let extra = []
    if (extraIds.length > 0) {
      const { data: ep } = await simDb
        .from('practice_projects')
        .select('id, project_name, project_code')
        .in('id', extraIds)
      extra = ep || []
    }

    const map = new Map()
    ;(own || []).forEach((p) => map.set(p.id, p))
    extra.forEach((p) => map.set(p.id, p))
    return Array.from(map.values()).sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''))
  } catch (err) {
    console.error('simWorkAuthorisationService.fetchPracticeProjectsForUser', err)
    return []
  }
}

export function hasApprovedActionForLifecycle(practiceProjectId, actionType) {
  return simDb.rpc('work_authorisation_has_approved_action', {
    p_practice_project_id: practiceProjectId,
    p_action_type: actionType,
  }).then(({ data, error }) => {
    if (error) return { success: false, data: false }
    return { success: true, data: data === true }
  })
}
