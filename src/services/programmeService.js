import { supabase } from './supabaseClient'

/**
 * Programme Service - API functions for Programme Management module
 */

/**
 * Get all programmes
 */
export async function getProgrammes(filters = {}) {
  let query = supabase
    .from('programmes')
    .select(`
      *,
      programme_owner:programme_owner_user_id (id, email, full_name),
      programme_manager:programme_manager_user_id (id, email, full_name),
      portfolio:portfolio_id (id, portfolio_name, portfolio_code)
    `)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('programme_status', filters.status)
  }

  if (filters.type) {
    query = query.eq('programme_type', filters.type)
  }

  if (filters.owner_id) {
    query = query.eq('programme_owner_user_id', filters.owner_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.search) {
    query = query.or(`programme_name.ilike.%${filters.search}%,programme_code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single programme by ID
 */
export async function getProgramme(programmeId) {
  const { data, error } = await supabase
    .from('programmes')
    .select(`
      *,
      programme_owner:programme_owner_user_id (id, email, full_name),
      programme_manager:programme_manager_user_id (id, email, full_name),
      portfolio:portfolio_id (id, portfolio_name, portfolio_code)
    `)
    .eq('id', programmeId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a programme
 */
export async function saveProgramme(programmeData, programmeId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...programmeData,
    updated_by: user.id,
  }

  if (programmeId) {
    // Update
    const { data, error } = await supabase
      .from('programmes')
      .update(updateData)
      .eq('id', programmeId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('programmes')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a programme (soft delete)
 */
export async function deleteProgramme(programmeId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programmes')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', programmeId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get projects in a programme
 */
export async function getProgrammeProjects(programmeId, filters = {}) {
  let query = supabase
    .from('programme_projects')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        project_status,
        start_date,
        end_date,
        project_manager_user_id,
        methodology
      )
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('assignment_status', filters.status)
  }

  if (filters.priority) {
    query = query.eq('programme_priority', filters.priority)
  }

  const { data, error } = await query.order('priority_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Add a project to a programme
 */
export async function addProjectToProgramme(programmeId, projectId, assignmentData = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const assignment = {
    programme_id: programmeId,
    project_id: projectId,
    assignment_date: new Date().toISOString().split('T')[0],
    assignment_status: 'active',
    ...assignmentData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('programme_projects')
    .insert(assignment)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a project from a programme
 */
export async function removeProjectFromProgramme(programmeId, projectId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programme_projects')
    .update({
      assignment_status: 'removed',
      updated_by: user.id,
    })
    .eq('programme_id', programmeId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get programme benefits
 */
export async function getProgrammeBenefits(programmeId) {
  const { data, error } = await supabase
    .from('programme_benefits')
    .select(`
      *,
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single programme benefit
 */
export async function getProgrammeBenefit(benefitId) {
  const { data, error } = await supabase
    .from('programme_benefits')
    .select(`
      *,
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .eq('id', benefitId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a programme benefit
 */
export async function saveProgrammeBenefit(programmeId, benefitData, benefitId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...benefitData,
    programme_id: programmeId,
    updated_by: user.id,
  }

  if (benefitId) {
    const { data, error } = await supabase
      .from('programme_benefits')
      .update(updateData)
      .eq('id', benefitId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('programme_benefits')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a programme benefit (soft delete)
 */
export async function deleteProgrammeBenefit(benefitId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programme_benefits')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', benefitId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get programme members
 */
export async function getProgrammeMembers(programmeId) {
  const { data, error } = await supabase
    .from('programme_members')
    .select(`
      *,
      user:user_id (id, email, full_name, avatar_url)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Add a member to a programme
 */
export async function addProgrammeMember(programmeId, userId, memberData = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const member = {
    programme_id: programmeId,
    user_id: userId,
    assignment_start_date: new Date().toISOString().split('T')[0],
    assignment_status: 'active',
    ...memberData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('programme_members')
    .insert(member)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a member from a programme
 */
export async function removeProgrammeMember(programmeId, userId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programme_members')
    .update({
      assignment_status: 'removed',
      assignment_end_date: new Date().toISOString().split('T')[0],
      updated_by: user.id,
    })
    .eq('programme_id', programmeId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get programme governance
 */
export async function getProgrammeGovernance(programmeId) {
  const { data, error } = await supabase
    .from('programme_governance')
    .select(`
      *,
      governance_board_chair:governance_board_chair_user_id (id, email, full_name)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data
}

/**
 * Create or update programme governance
 */
export async function saveProgrammeGovernance(programmeId, governanceData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if governance exists
  const existing = await getProgrammeGovernance(programmeId)

  const updateData = {
    ...governanceData,
    programme_id: programmeId,
    updated_by: user.id,
  }

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('programme_governance')
      .update(updateData)
      .eq('programme_id', programmeId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('programme_governance')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get programme milestones
 */
export async function getProgrammeMilestones(programmeId) {
  const { data, error } = await supabase
    .from('programme_milestones')
    .select(`
      *,
      milestone_owner:milestone_owner_user_id (id, email, full_name)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)
    .order('planned_date', { ascending: true, nullsLast: true })

  if (error) throw error
  return data
}

/**
 * Create or update a programme milestone
 */
export async function saveProgrammeMilestone(programmeId, milestoneData, milestoneId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...milestoneData,
    programme_id: programmeId,
    updated_by: user.id,
  }

  if (milestoneId) {
    const { data, error } = await supabase
      .from('programme_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('programme_milestones')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a programme milestone (soft delete)
 */
export async function deleteProgrammeMilestone(milestoneId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programme_milestones')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', milestoneId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get programme dependencies
 */
export async function getProgrammeDependencies(programmeId, filters = {}) {
  let query = supabase
    .from('programme_dependencies')
    .select(`
      *,
      source_project:source_project_id (id, project_name, project_code),
      target_project:target_project_id (id, project_name, project_code),
      dependency_owner:dependency_owner_user_id (id, email, full_name)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('dependency_status', filters.status)
  }

  if (filters.criticality) {
    query = query.eq('dependency_criticality', filters.criticality)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a programme dependency
 */
export async function saveProgrammeDependency(programmeId, dependencyData, dependencyId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...dependencyData,
    programme_id: programmeId,
    updated_by: user.id,
  }

  if (dependencyId) {
    const { data, error } = await supabase
      .from('programme_dependencies')
      .update(updateData)
      .eq('id', dependencyId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('programme_dependencies')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a programme dependency (soft delete)
 */
export async function deleteProgrammeDependency(dependencyId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('programme_dependencies')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', dependencyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get programme reports
 */
export async function getProgrammeReports(programmeId, filters = {}) {
  let query = supabase
    .from('programme_reports')
    .select(`
      *,
      generated_by:generated_by_user_id (id, email, full_name),
      approved_by:approved_by_user_id (id, email, full_name)
    `)
    .eq('programme_id', programmeId)
    .eq('is_deleted', false)

  if (filters.report_type) {
    query = query.eq('report_type', filters.report_type)
  }

  if (filters.status) {
    query = query.eq('report_status', filters.status)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get dashboard stats for a programme
 */
export async function getProgrammeDashboardStats(programmeId) {
  try {
    const [programme, projects, benefits, milestones, dependencies] = await Promise.all([
      getProgramme(programmeId),
      getProgrammeProjects(programmeId),
      getProgrammeBenefits(programmeId),
      getProgrammeMilestones(programmeId),
      getProgrammeDependencies(programmeId),
    ])

    // Calculate stats
    const activeProjects = projects.filter(p => p.assignment_status === 'active').length
    const completedProjects = projects.filter(p => p.assignment_status === 'completed').length
    const onHoldProjects = projects.filter(p => p.assignment_status === 'on-hold').length

    const realizedBenefits = benefits.filter(b => b.benefit_status === 'realized').length
    const inProgressBenefits = benefits.filter(b => b.benefit_status === 'in-progress').length

    const completedMilestones = milestones.filter(m => m.milestone_status === 'completed').length
    const atRiskMilestones = milestones.filter(m => m.milestone_status === 'at-risk').length

    const criticalDependencies = dependencies.filter(d => d.dependency_criticality === 'critical').length
    const activeDependencies = dependencies.filter(d => d.dependency_status === 'active').length

    // Calculate progress
    const totalProjects = projects.length
    const progressPercentage = totalProjects > 0 
      ? (completedProjects / totalProjects) * 100 
      : 0

    // Calculate benefits realization
    const totalBenefits = benefits.length
    const benefitsRealization = totalBenefits > 0
      ? (realizedBenefits / totalBenefits) * 100
      : 0

    return {
      programme,
      stats: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        totalBenefits,
        realizedBenefits,
        inProgressBenefits,
        totalMilestones: milestones.length,
        completedMilestones,
        atRiskMilestones,
        totalDependencies: dependencies.length,
        criticalDependencies,
        activeDependencies,
        progressPercentage: programme.overall_progress_percentage || progressPercentage,
        benefitsRealization: programme.benefits_realization_percentage || benefitsRealization,
        healthScore: programme.overall_health_score || 0,
      },
      projects,
      benefits,
      milestones,
      dependencies,
    }
  } catch (error) {
    console.error('Error getting programme dashboard stats:', error)
    throw error
  }
}

