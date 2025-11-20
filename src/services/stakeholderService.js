import { supabase } from './supabaseClient'

/**
 * Stakeholder Service - API functions for Stakeholder Management module
 */

// ================================================
// STAKEHOLDERS
// ================================================

/**
 * Get all stakeholders
 */
export async function getStakeholders(filters = {}) {
  let query = supabase
    .from('stakeholders')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        project_status
      ),
      user:user_id (id, email, full_name),
      reports_to:reports_to_stakeholder_id (id, stakeholder_name, stakeholder_reference)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_type) {
    query = query.eq('stakeholder_type', filters.stakeholder_type)
  }

  if (filters.stakeholder_status) {
    query = query.eq('stakeholder_status', filters.stakeholder_status)
  }

  if (filters.search) {
    query = query.or(`stakeholder_name.ilike.%${filters.search}%,stakeholder_reference.ilike.%${filters.search}%,stakeholder_organization.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('stakeholder_name', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get a single stakeholder by ID
 */
export async function getStakeholder(stakeholderId) {
  const { data, error } = await supabase
    .from('stakeholders')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      user:user_id (id, email, full_name),
      reports_to:reports_to_stakeholder_id (id, stakeholder_name, stakeholder_reference)
    `)
    .eq('id', stakeholderId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a stakeholder
 */
export async function saveStakeholder(stakeholderData, stakeholderId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...stakeholderData,
    updated_by: user.id,
  }

  if (stakeholderId) {
    const { data, error } = await supabase
      .from('stakeholders')
      .update(updateData)
      .eq('id', stakeholderId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('stakeholders')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a stakeholder (soft delete)
 */
export async function deleteStakeholder(stakeholderId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('stakeholders')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', stakeholderId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// STAKEHOLDER ANALYSIS
// ================================================

/**
 * Get stakeholder analysis records
 */
export async function getStakeholderAnalysis(filters = {}) {
  let query = supabase
    .from('stakeholder_analysis')
    .select(`
      *,
      stakeholder:stakeholder_id (
        id,
        stakeholder_name,
        stakeholder_reference,
        stakeholder_type
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      analyzed_by_user:analyzed_by (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_id) {
    query = query.eq('stakeholder_id', filters.stakeholder_id)
  }

  if (filters.matrix_quadrant) {
    query = query.eq('matrix_quadrant', filters.matrix_quadrant)
  }

  const { data, error } = await query.order('analysis_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update stakeholder analysis
 */
export async function saveStakeholderAnalysis(analysisData, analysisId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...analysisData,
    updated_by: user.id,
  }

  if (analysisId) {
    const { data, error } = await supabase
      .from('stakeholder_analysis')
      .update(updateData)
      .eq('id', analysisId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.analyzed_by) {
      updateData.analyzed_by = user.id
    }
    if (!updateData.analysis_date) {
      updateData.analysis_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await supabase
      .from('stakeholder_analysis')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ================================================
// STAKEHOLDER ENGAGEMENT
// ================================================

/**
 * Get stakeholder engagement records
 */
export async function getStakeholderEngagement(filters = {}) {
  let query = supabase
    .from('stakeholder_engagement')
    .select(`
      *,
      stakeholder:stakeholder_id (
        id,
        stakeholder_name,
        stakeholder_reference
      ),
      project:project_id (
        id,
        project_name,
        project_code
      )
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.stakeholder_id) {
    query = query.eq('stakeholder_id', filters.stakeholder_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update stakeholder engagement
 */
export async function saveStakeholderEngagement(engagementData, engagementId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...engagementData,
    updated_by: user.id,
  }

  if (engagementId) {
    const { data, error } = await supabase
      .from('stakeholder_engagement')
      .update(updateData)
      .eq('id', engagementId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('stakeholder_engagement')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ================================================
// COMMUNICATION PLANS
// ================================================

/**
 * Get communication plans
 */
export async function getCommunicationPlans(filters = {}) {
  let query = supabase
    .from('communication_plans')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      owner:owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update communication plan
 */
export async function saveCommunicationPlan(planData, planId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...planData,
    updated_by: user.id,
  }

  if (planId) {
    const { data, error } = await supabase
      .from('communication_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.owner_user_id) {
      updateData.owner_user_id = user.id
    }
    const { data, error } = await supabase
      .from('communication_plans')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get stakeholder management dashboard stats
 */
export async function getStakeholderManagementStats(filters = {}) {
  try {
    const [stakeholders, analysis, engagement] = await Promise.all([
      getStakeholders(filters),
      getStakeholderAnalysis(filters),
      getStakeholderEngagement(filters),
    ])

    const stats = {
      totalStakeholders: stakeholders.length,
      activeStakeholders: stakeholders.filter(s => s.stakeholder_status === 'active').length,
      internalStakeholders: stakeholders.filter(s => s.stakeholder_type === 'internal').length,
      externalStakeholders: stakeholders.filter(s => s.stakeholder_type === 'external').length,
      totalAnalysis: analysis.length,
      byQuadrant: {
        'manage-closely': analysis.filter(a => a.matrix_quadrant === 'manage-closely').length,
        'keep-satisfied': analysis.filter(a => a.matrix_quadrant === 'keep-satisfied').length,
        'monitor': analysis.filter(a => a.matrix_quadrant === 'monitor').length,
        'keep-informed': analysis.filter(a => a.matrix_quadrant === 'keep-informed').length,
      },
      byAttitude: {
        'champion': analysis.filter(a => a.current_attitude === 'champion').length,
        'supporter': analysis.filter(a => a.current_attitude === 'supporter').length,
        'neutral': analysis.filter(a => a.current_attitude === 'neutral').length,
        'critic': analysis.filter(a => a.current_attitude === 'critic').length,
        'blocker': analysis.filter(a => a.current_attitude === 'blocker').length,
      },
      totalEngagement: engagement.length,
    }

    return stats
  } catch (error) {
    console.error('Error getting stakeholder management stats:', error)
    throw error
  }
}

export default {
  // Stakeholders
  getStakeholders,
  getStakeholder,
  saveStakeholder,
  deleteStakeholder,
  
  // Stakeholder Analysis
  getStakeholderAnalysis,
  saveStakeholderAnalysis,
  
  // Stakeholder Engagement
  getStakeholderEngagement,
  saveStakeholderEngagement,
  
  // Communication Plans
  getCommunicationPlans,
  saveCommunicationPlan,
  
  // Dashboard
  getStakeholderManagementStats,
}

