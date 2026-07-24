import { platformDb } from './supabase/supabaseClient'

/**
 * Strategic Service - API functions for Strategic Alignment Tools module
 */

// ================================================
// STRATEGIC OBJECTIVES
// ================================================

/**
 * Get all strategic objectives
 */
export async function getStrategicObjectives(filters = {}) {
  let query = platformDb
    .from('strategic_objectives')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      parent_objective:parent_objective_id (
        id,
        objective_name,
        objective_code
      ),
      objective_owner:objective_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.objective_category) {
    query = query.eq('objective_category', filters.objective_category)
  }

  if (filters.objective_type) {
    query = query.eq('objective_type', filters.objective_type)
  }

  if (filters.objective_level) {
    query = query.eq('objective_level', filters.objective_level)
  }

  if (filters.objective_status) {
    query = query.eq('objective_status', filters.objective_status)
  }

  if (filters.parent_objective_id) {
    query = query.eq('parent_objective_id', filters.parent_objective_id)
  }

  if (filters.search) {
    query = query.or(`objective_name.ilike.%${filters.search}%,objective_code.ilike.%${filters.search}%,objective_description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('priority', { ascending: false }).order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single strategic objective by ID
 */
export async function getStrategicObjective(objectiveId) {
  const { data, error } = await platformDb
    .from('strategic_objectives')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      parent_objective:parent_objective_id (
        id,
        objective_name,
        objective_code
      ),
      objective_owner:objective_owner_user_id (id, email, full_name)
    `)
    .eq('id', objectiveId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a strategic objective
 */
export async function saveStrategicObjective(objectiveData, objectiveId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...objectiveData,
    updated_by: user.id,
  }

  if (objectiveId) {
    const { data, error } = await platformDb
      .from('strategic_objectives')
      .update(updateData)
      .eq('id', objectiveId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.objective_owner_user_id) {
      updateData.objective_owner_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('strategic_objectives')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a strategic objective (soft delete)
 */
export async function deleteStrategicObjective(objectiveId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('strategic_objectives')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', objectiveId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// OBJECTIVE HIERARCHIES
// ================================================

/**
 * Get objective hierarchies
 */
export async function getObjectiveHierarchies(parentObjectiveId = null) {
  let query = platformDb
    .from('objective_hierarchies')
    .select(`
      *,
      parent_objective:parent_objective_id (
        id,
        objective_name,
        objective_code,
        objective_category
      ),
      child_objective:child_objective_id (
        id,
        objective_name,
        objective_code,
        objective_category
      )
    `)
    .eq('is_deleted', false)

  if (parentObjectiveId) {
    query = query.eq('parent_objective_id', parentObjectiveId)
  }

  const { data, error } = await query.order('hierarchy_level', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create or update an objective hierarchy
 */
export async function saveObjectiveHierarchy(hierarchyData, hierarchyId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...hierarchyData,
    updated_by: user.id,
  }

  if (hierarchyId) {
    const { data, error } = await platformDb
      .from('objective_hierarchies')
      .update(updateData)
      .eq('id', hierarchyId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('objective_hierarchies')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete an objective hierarchy (soft delete)
 */
export async function deleteObjectiveHierarchy(hierarchyId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('objective_hierarchies')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', hierarchyId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// PROJECT-OBJECTIVE MAPPINGS
// ================================================

/**
 * Get project-objective mappings
 */
export async function getProjectObjectiveMappings(filters = {}) {
  let query = platformDb
    .from('project_objective_mappings')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        status_id,
        project_statuses(status_name, status_code),
        methodology
      ),
      objective:objective_id (
        id,
        objective_name,
        objective_code,
        objective_category,
        strategic_importance
      ),
      mapped_by:mapped_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.objective_id) {
    query = query.eq('objective_id', filters.objective_id)
  }

  if (filters.mapping_type) {
    query = query.eq('mapping_type', filters.mapping_type)
  }

  if (filters.contribution_status) {
    query = query.eq('contribution_status', filters.contribution_status)
  }

  const { data, error } = await query.order('alignment_score', { ascending: false }).order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a project-objective mapping
 */
export async function saveProjectObjectiveMapping(mappingData, mappingId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...mappingData,
    updated_by: user.id,
  }

  if (mappingId) {
    const { data, error } = await platformDb
      .from('project_objective_mappings')
      .update(updateData)
      .eq('id', mappingId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.mapped_by_user_id) {
      updateData.mapped_by_user_id = user.id
    }
    if (!updateData.mapped_date) {
      updateData.mapped_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('project_objective_mappings')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a project-objective mapping (soft delete)
 */
export async function deleteProjectObjectiveMapping(mappingId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('project_objective_mappings')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', mappingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Calculate alignment score for a project
 */
export async function calculateProjectAlignmentScore(projectId) {
  const { data, error } = await platformDb.rpc('calculate_project_alignment_score', {
    p_project_id: projectId,
  })

  if (error) throw error
  return data || 0
}

// ================================================
// STRATEGIC CONTRIBUTIONS
// ================================================

/**
 * Get strategic contributions
 */
export async function getStrategicContributions(filters = {}) {
  let query = platformDb
    .from('strategic_contributions')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        status_id,
        project_statuses(status_name, status_code)
      ),
      objective:objective_id (
        id,
        objective_name,
        objective_code,
        objective_category
      ),
      assessed_by:contribution_assessed_by_user_id (id, email, full_name),
      created_by_user:created_by (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.objective_id) {
    query = query.eq('objective_id', filters.objective_id)
  }

  if (filters.contribution_type) {
    query = query.eq('contribution_type', filters.contribution_type)
  }

  if (filters.contribution_status) {
    query = query.eq('contribution_status', filters.contribution_status)
  }

  const { data, error } = await query.order('contribution_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a strategic contribution
 */
export async function saveStrategicContribution(contributionData, contributionId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...contributionData,
    updated_by: user.id,
  }

  if (contributionId) {
    const { data, error } = await platformDb
      .from('strategic_contributions')
      .update(updateData)
      .eq('id', contributionId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.contribution_assessed_by_user_id) {
      updateData.contribution_assessed_by_user_id = user.id
    }
    if (!updateData.contribution_date) {
      updateData.contribution_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('strategic_contributions')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a strategic contribution (soft delete)
 */
export async function deleteStrategicContribution(contributionId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('strategic_contributions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', contributionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// ALIGNMENT SCORES
// ================================================

/**
 * Get alignment scores
 */
export async function getAlignmentScores(filters = {}) {
  let query = platformDb
    .from('alignment_scores')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      project:project_id (
        id,
        project_name,
        project_code,
        status_id,
        project_statuses(status_name, status_code)
      ),
      calculated_by:calculated_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.start_date && filters.end_date) {
    query = query.gte('score_date', filters.start_date)
    query = query.lte('score_date', filters.end_date)
  }

  const { data, error } = await query.order('score_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update an alignment score
 */
export async function saveAlignmentScore(scoreData, scoreId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...scoreData,
    updated_by: user.id,
  }

  if (scoreId) {
    const { data, error } = await platformDb
      .from('alignment_scores')
      .update(updateData)
      .eq('id', scoreId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.calculated_by_user_id) {
      updateData.calculated_by_user_id = user.id
    }
    if (!updateData.score_date) {
      updateData.score_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('alignment_scores')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete an alignment score (soft delete)
 */
export async function deleteAlignmentScore(scoreId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('alignment_scores')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', scoreId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// STRATEGIC REPORTS
// ================================================

/**
 * Get strategic reports
 */
export async function getStrategicReports(filters = {}) {
  let query = platformDb
    .from('strategic_reports')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      report_owner:report_owner_user_id (id, email, full_name),
      generated_by:generated_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.report_type) {
    query = query.eq('report_type', filters.report_type)
  }

  if (filters.report_status) {
    query = query.eq('report_status', filters.report_status)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a strategic report
 */
export async function saveStrategicReport(reportData, reportId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...reportData,
    updated_by: user.id,
  }

  if (reportId) {
    const { data, error } = await platformDb
      .from('strategic_reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.report_owner_user_id) {
      updateData.report_owner_user_id = user.id
    }
    if (!updateData.generated_by_user_id) {
      updateData.generated_by_user_id = user.id
    }
    if (!updateData.report_date) {
      updateData.report_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('strategic_reports')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a strategic report (soft delete)
 */
export async function deleteStrategicReport(reportId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('strategic_reports')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get strategic alignment dashboard stats
 */
export async function getStrategicAlignmentDashboardStats(filters = {}) {
  try {
    const [objectives, mappings, scores] = await Promise.all([
      getStrategicObjectives(filters),
      getProjectObjectiveMappings(filters),
      getAlignmentScores(filters),
    ])

    const stats = {
      totalObjectives: objectives.length,
      activeObjectives: objectives.filter(o => o.objective_status === 'active').length,
      completedObjectives: objectives.filter(o => o.objective_status === 'completed' || o.objective_status === 'achieved').length,
      totalMappings: mappings.length,
      activeMappings: mappings.filter(m => m.contribution_status === 'active').length,
      projectsWithMappings: new Set(mappings.map(m => m.project_id)).size,
      averageAlignmentScore: scores.length > 0
        ? scores.reduce((sum, s) => sum + (parseFloat(s.overall_alignment_score) || 0), 0) / scores.length
        : 0,
      byCategory: objectives.reduce((acc, o) => {
        acc[o.objective_category] = (acc[o.objective_category] || 0) + 1
        return acc
      }, {}),
    }

    return stats
  } catch (error) {
    console.error('Error getting strategic alignment dashboard stats:', error)
    throw error
  }
}

/**
 * Get alignment scores for a portfolio
 */
export async function getPortfolioAlignmentScores(portfolioId) {
  try {
    const scores = await getAlignmentScores({ portfolio_id: portfolioId })
    return scores || []
  } catch (error) {
    console.error('Error getting portfolio alignment scores:', error)
    throw error
  }
}

/**
 * Get project alignment details
 */
export async function getProjectAlignmentDetails(projectId) {
  try {
    const [mappings, contributions, alignmentScore] = await Promise.all([
      getProjectObjectiveMappings({ project_id: projectId }),
      getStrategicContributions({ project_id: projectId }),
      calculateProjectAlignmentScore(projectId),
    ])

    return {
      mappings: mappings || [],
      contributions: contributions || [],
      alignmentScore: alignmentScore || 0,
    }
  } catch (error) {
    console.error('Error getting project alignment details:', error)
    throw error
  }
}
