/**
 * Practice Stakeholder Service
 * CRUD operations for practice stakeholder register (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeStakeholders(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_stakeholder_register').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.stakeholder_type) query = query.eq('stakeholder_type', filters.stakeholder_type)
    if (filters.stakeholder_status) query = query.eq('stakeholder_status', filters.stakeholder_status)
    if (filters.search) query = query.or(`stakeholder_name.ilike.%${filters.search}%,stakeholder_organization.ilike.%${filters.search}%`)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeStakeholder(projectId, stakeholderData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_stakeholder_register').insert({ ...stakeholderData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeStakeholder(stakeholderId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_stakeholder_register').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', stakeholderId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeStakeholder(stakeholderId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_stakeholder_register').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', stakeholderId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Stakeholder Analysis ==========
export async function getPracticeStakeholderAnalysis(filters = {}) {
  try {
    let query = simDb.from('practice_stakeholder_analysis').select('*, practice_stakeholder:practice_stakeholder_id(id, stakeholder_name, stakeholder_reference)').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    if (filters.practice_stakeholder_id) query = query.eq('practice_stakeholder_id', filters.practice_stakeholder_id)
    const { data, error } = await query.order('analysis_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function savePracticeStakeholderAnalysis(payload, analysisId = null) {
  try {
    const userId = await getCurrentUserId()
    const row = { ...payload, updated_by: userId, user_id: userId }
    if (analysisId) {
      const { data, error } = await simDb.from('practice_stakeholder_analysis').update(row).eq('id', analysisId).eq('user_id', userId).select().single()
      if (error) throw error
      return { success: true, data }
    }
    row.created_by = userId
    const { data, error } = await simDb.from('practice_stakeholder_analysis').insert(row).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeStakeholderAnalysis(analysisId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_stakeholder_analysis').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', analysisId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Engagement Plans ==========
export async function getPracticeEngagementPlans(filters = {}) {
  try {
    let query = simDb.from('practice_engagement_plans').select('*, practice_stakeholder:practice_stakeholder_id(id, stakeholder_name)').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function savePracticeEngagementPlan(payload, planId = null) {
  try {
    const userId = await getCurrentUserId()
    const row = { ...payload, updated_by: userId, user_id: userId }
    if (planId) {
      const { data, error } = await simDb.from('practice_engagement_plans').update(row).eq('id', planId).eq('user_id', userId).select().single()
      if (error) throw error
      return { success: true, data }
    }
    row.created_by = userId
    const { data, error } = await simDb.from('practice_engagement_plans').insert(row).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeEngagementPlan(planId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_engagement_plans').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', planId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Communication Plans ==========
export async function getPracticeCommunicationPlans(filters = {}) {
  try {
    let query = simDb.from('practice_communication_plans').select('*').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function savePracticeCommunicationPlan(payload, planId = null) {
  try {
    const userId = await getCurrentUserId()
    const row = { ...payload, updated_by: userId, user_id: userId }
    if (planId) {
      const { data, error } = await simDb.from('practice_communication_plans').update(row).eq('id', planId).eq('user_id', userId).select().single()
      if (error) throw error
      return { success: true, data }
    }
    row.created_by = userId
    const { data, error } = await simDb.from('practice_communication_plans').insert(row).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeCommunicationPlan(planId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_communication_plans').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', planId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Communication Log ==========
export async function getPracticeCommunicationLog(filters = {}) {
  try {
    let query = simDb.from('practice_communication_log').select('*').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    const { data, error } = await query.order('sent_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function savePracticeCommunicationLog(payload, logId = null) {
  try {
    const userId = await getCurrentUserId()
    const row = { ...payload, updated_by: userId, user_id: userId }
    if (logId) {
      const { data, error } = await simDb.from('practice_communication_log').update(row).eq('id', logId).eq('user_id', userId).select().single()
      if (error) throw error
      return { success: true, data }
    }
    row.created_by = userId
    const { data, error } = await simDb.from('practice_communication_log').insert(row).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Engagement Actions ==========
export async function getPracticeEngagementActions(filters = {}) {
  try {
    let query = simDb.from('practice_engagement_actions').select(`
      *,
      practice_stakeholder:practice_stakeholder_id (id, stakeholder_name, stakeholder_reference)
    `).eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    if (filters.practice_stakeholder_id) query = query.eq('practice_stakeholder_id', filters.practice_stakeholder_id)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function savePracticeEngagementAction(actionData, actionId = null) {
  try {
    const userId = await getCurrentUserId()
    const payload = {
      practice_project_id: actionData.practice_project_id,
      practice_stakeholder_id: actionData.practice_stakeholder_id,
      action_description: actionData.action_description,
      owner_user_id: actionData.owner_user_id || null,
      due_date: actionData.due_date || null,
      status: actionData.status || 'open',
      action_type: actionData.action_type || 'other',
      priority: actionData.priority || 'medium',
      completion_date: actionData.completion_date || null,
      outcome_notes: actionData.outcome_notes || null,
      updated_by: userId,
    }
    if (actionId) {
      const { data, error } = await simDb.from('practice_engagement_actions').update(payload).eq('id', actionId).select().single()
      if (error) throw error
      return { success: true, data }
    }
    payload.created_by = userId
    const { data, error } = await simDb.from('practice_engagement_actions').insert(payload).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeEngagementAction(actionId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_engagement_actions').update({ is_deleted: true, updated_at: new Date().toISOString(), updated_by: userId }).eq('id', actionId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Stakeholder Stats ==========
export async function getPracticeStakeholderStats(projectId) {
  try {
    const [stakeholders, analysis, engagement] = await Promise.all([
      getPracticeStakeholders(projectId),
      getPracticeStakeholderAnalysis({ practice_project_id: projectId }),
      getPracticeEngagementPlans({ practice_project_id: projectId }),
    ])
    const st = stakeholders.data || []
    const an = analysis.data || []
    const en = engagement.data || []
    return {
      success: true,
      data: {
        totalStakeholders: st.length,
        activeStakeholders: st.filter(s => s.stakeholder_status === 'active').length,
        totalAnalysis: an.length,
        byQuadrant: { 'manage-closely': an.filter(a => a.matrix_quadrant === 'manage-closely').length, 'keep-satisfied': an.filter(a => a.matrix_quadrant === 'keep-satisfied').length, 'monitor': an.filter(a => a.matrix_quadrant === 'monitor').length, 'keep-informed': an.filter(a => a.matrix_quadrant === 'keep-informed').length },
        byAttitude: { champion: an.filter(a => a.current_attitude === 'champion').length, supporter: an.filter(a => a.current_attitude === 'supporter').length, neutral: an.filter(a => a.current_attitude === 'neutral').length, critic: an.filter(a => a.current_attitude === 'critic').length, blocker: an.filter(a => a.current_attitude === 'blocker').length },
        totalEngagement: en.length,
      },
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default {
  getPracticeStakeholders,
  createPracticeStakeholder,
  updatePracticeStakeholder,
  deletePracticeStakeholder,
  getPracticeStakeholderAnalysis,
  savePracticeStakeholderAnalysis,
  deletePracticeStakeholderAnalysis,
  getPracticeEngagementPlans,
  savePracticeEngagementPlan,
  deletePracticeEngagementPlan,
  getPracticeCommunicationPlans,
  savePracticeCommunicationPlan,
  deletePracticeCommunicationPlan,
  getPracticeCommunicationLog,
  savePracticeCommunicationLog,
  getPracticeEngagementActions,
  savePracticeEngagementAction,
  deletePracticeEngagementAction,
  getPracticeStakeholderStats,
}
