import { supabase } from './supabaseClient'

/**
 * Cross-Project Resource Service - API functions for Cross-Project Resource Management module
 */

// ================================================
// CROSS-PROJECT RESOURCE ALLOCATIONS
// ================================================

/**
 * Get all cross-project resource allocations
 */
export async function getCrossProjectAllocations(filters = {}) {
  let query = supabase
    .from('cross_project_resource_allocations')
    .select(`
      *,
      resource:resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category,
        user:user_id (id, email, full_name)
      ),
      project:project_id (
        id,
        project_name,
        project_code,
        project_status
      ),
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      allocated_by:allocated_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.resource_id) {
    query = query.eq('resource_id', filters.resource_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.status) {
    query = query.eq('allocation_status', filters.status)
  }

  if (filters.start_date) {
    query = query.lte('allocation_start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.gte('allocation_end_date', filters.end_date)
  }

  const { data, error } = await query.order('allocation_start_date', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get a single allocation by ID
 */
export async function getCrossProjectAllocation(allocationId) {
  const { data, error } = await supabase
    .from('cross_project_resource_allocations')
    .select(`
      *,
      resource:resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category,
        user:user_id (id, email, full_name)
      ),
      project:project_id (
        id,
        project_name,
        project_code,
        project_status
      ),
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      allocated_by:allocated_by_user_id (id, email, full_name)
    `)
    .eq('id', allocationId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a cross-project resource allocation
 */
export async function saveCrossProjectAllocation(allocationData, allocationId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...allocationData,
    updated_by: user.id,
  }

  if (allocationId) {
    const { data, error } = await supabase
      .from('cross_project_resource_allocations')
      .update(updateData)
      .eq('id', allocationId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.allocated_by_user_id) {
      updateData.allocated_by_user_id = user.id
    }
    const { data, error } = await supabase
      .from('cross_project_resource_allocations')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a cross-project resource allocation (soft delete)
 */
export async function deleteCrossProjectAllocation(allocationId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cross_project_resource_allocations')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', allocationId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get resource allocations for a specific resource across all projects
 */
export async function getResourceAllocationsAcrossProjects(resourceId, filters = {}) {
  return getCrossProjectAllocations({ ...filters, resource_id: resourceId })
}

/**
 * Get resource allocations for a specific project
 */
export async function getProjectResourceAllocations(projectId, filters = {}) {
  return getCrossProjectAllocations({ ...filters, project_id: projectId })
}

/**
 * Check for resource conflicts (over-allocation)
 */
export async function checkResourceConflicts(resourceId, startDate, endDate, excludeAllocationId = null) {
  let query = supabase
    .from('cross_project_resource_allocations')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('is_deleted', false)
    .in('allocation_status', ['planned', 'confirmed', 'active'])
    .or(`and(allocation_start_date.lte.${endDate},allocation_end_date.gte.${startDate}),and(allocation_end_date.is.null,allocation_start_date.lte.${endDate})`)

  if (excludeAllocationId) {
    query = query.neq('id', excludeAllocationId)
  }

  const { data, error } = await query

  if (error) throw error
  
  // Calculate total allocation percentage for overlapping periods
  const conflicts = []
  const totalAllocation = data.reduce((sum, alloc) => {
    // Calculate overlap
    const overlapStart = new Date(Math.max(new Date(alloc.allocation_start_date).getTime(), new Date(startDate).getTime()))
    const overlapEnd = alloc.allocation_end_date 
      ? new Date(Math.min(new Date(alloc.allocation_end_date).getTime(), new Date(endDate).getTime()))
      : new Date(endDate)
    
    if (overlapStart <= overlapEnd) {
      conflicts.push(alloc)
      return sum + (alloc.allocation_percentage || 0)
    }
    return sum
  }, 0)

  return {
    hasConflict: totalAllocation > 100,
    totalAllocationPercentage: totalAllocation,
    conflictingAllocations: conflicts,
    availablePercentage: Math.max(0, 100 - totalAllocation)
  }
}

// ================================================
// RESOURCE CAPACITY PLANS
// ================================================

/**
 * Get resource capacity plans
 */
export async function getResourceCapacityPlans(filters = {}) {
  let query = supabase
    .from('resource_capacity_plans')
    .select(`
      *,
      resource:resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category
      ),
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      plan_owner:plan_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.resource_id) {
    query = query.eq('resource_id', filters.resource_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.status) {
    query = query.eq('plan_status', filters.status)
  }

  if (filters.start_date) {
    query = query.lte('plan_start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.gte('plan_end_date', filters.end_date)
  }

  const { data, error } = await query.order('plan_start_date', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create or update a resource capacity plan
 */
export async function saveResourceCapacityPlan(planData, planId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...planData,
    updated_by: user.id,
  }

  if (planId) {
    const { data, error } = await supabase
      .from('resource_capacity_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.plan_owner_user_id) {
      updateData.plan_owner_user_id = user.id
    }
    const { data, error } = await supabase
      .from('resource_capacity_plans')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a resource capacity plan (soft delete)
 */
export async function deleteResourceCapacityPlan(planId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('resource_capacity_plans')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', planId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// RESOURCE FORECASTS
// ================================================

/**
 * Get resource forecasts
 */
export async function getResourceForecasts(filters = {}) {
  let query = supabase
    .from('resource_forecasts')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      forecast_owner:forecast_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.resource_category) {
    query = query.eq('resource_category', filters.resource_category)
  }

  if (filters.resource_type) {
    query = query.eq('resource_type', filters.resource_type)
  }

  if (filters.start_date) {
    query = query.lte('forecast_start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.gte('forecast_end_date', filters.end_date)
  }

  const { data, error } = await query.order('forecast_start_date', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create or update a resource forecast
 */
export async function saveResourceForecast(forecastData, forecastId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...forecastData,
    updated_by: user.id,
  }

  if (forecastId) {
    const { data, error } = await supabase
      .from('resource_forecasts')
      .update(updateData)
      .eq('id', forecastId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.forecast_owner_user_id) {
      updateData.forecast_owner_user_id = user.id
    }
    const { data, error } = await supabase
      .from('resource_forecasts')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a resource forecast (soft delete)
 */
export async function deleteResourceForecast(forecastId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('resource_forecasts')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', forecastId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// CROSS-PROJECT UTILIZATION
// ================================================

/**
 * Get cross-project utilization data
 */
export async function getCrossProjectUtilization(filters = {}) {
  let query = supabase
    .from('cross_project_utilization')
    .select(`
      *,
      resource:resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category
      )
    `)
    .eq('is_deleted', false)

  if (filters.resource_id) {
    query = query.eq('resource_id', filters.resource_id)
  }

  if (filters.start_date) {
    query = query.lte('utilization_period_start_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.gte('utilization_period_end_date', filters.end_date)
  }

  if (filters.period_type) {
    query = query.eq('period_type', filters.period_type)
  }

  if (filters.status) {
    query = query.eq('utilization_status', filters.status)
  }

  const { data, error } = await query.order('utilization_period_start_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get utilization summary for a resource
 */
export async function getResourceUtilizationSummary(resourceId, startDate, endDate) {
  const { data, error } = await supabase
    .from('cross_project_utilization')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('is_deleted', false)
    .gte('utilization_period_start_date', startDate)
    .lte('utilization_period_end_date', endDate)
    .order('utilization_period_start_date', { ascending: true })

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      totalCapacityHours: 0,
      totalAllocatedHours: 0,
      totalActualHours: 0,
      averageUtilization: 0,
      periods: []
    }
  }

  const totalCapacityHours = data.reduce((sum, period) => sum + (period.total_capacity_hours || 0), 0)
  const totalAllocatedHours = data.reduce((sum, period) => sum + (period.total_allocated_hours || 0), 0)
  const totalActualHours = data.reduce((sum, period) => sum + (period.actual_worked_hours || 0), 0)
  const averageUtilization = data.length > 0
    ? data.reduce((sum, period) => sum + (period.actual_utilization_percentage || 0), 0) / data.length
    : 0

  return {
    totalCapacityHours,
    totalAllocatedHours,
    totalActualHours,
    averageUtilization,
    periods: data
  }
}

// ================================================
// RESOURCE SKILLS MATCHING
// ================================================

/**
 * Get resource skills matching records
 */
export async function getResourceSkillsMatching(filters = {}) {
  let query = supabase
    .from('resource_skills_matching')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      task:task_id (
        id,
        task_name,
        task_code
      ),
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      best_match:best_match_resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category
      ),
      requested_by:requested_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.task_id) {
    query = query.eq('task_id', filters.task_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.status) {
    query = query.eq('matching_status', filters.status)
  }

  const { data, error } = await query.order('requested_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create a resource skills matching request
 */
export async function createResourceSkillsMatching(matchingData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const matching = {
    ...matchingData,
    requested_by_user_id: user.id,
    requested_at: new Date().toISOString(),
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('resource_skills_matching')
    .insert(matching)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update resource skills matching results
 */
export async function updateResourceSkillsMatching(matchingId, matchingResults) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('resource_skills_matching')
    .update({
      ...matchingResults,
      updated_by: user.id,
    })
    .eq('id', matchingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a resource skills matching record (soft delete)
 */
export async function deleteResourceSkillsMatching(matchingId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('resource_skills_matching')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', matchingId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// RESOURCE CONFLICTS (Enhanced)
// ================================================

/**
 * Get resource conflicts (enhanced with cross-project support)
 */
export async function getResourceConflicts(filters = {}) {
  let query = supabase
    .from('resource_conflicts')
    .select(`
      *,
      resource:resource_id (
        id,
        resource_name,
        resource_code,
        resource_type,
        resource_category
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      )
    `)
    .eq('is_deleted', false)

  if (filters.resource_id) {
    query = query.eq('resource_id', filters.resource_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.is_cross_project_conflict !== undefined) {
    query = query.eq('is_cross_project_conflict', filters.is_cross_project_conflict)
  }

  if (filters.status) {
    query = query.eq('conflict_status', filters.status)
  }

  const { data, error } = await query.order('detected_at', { ascending: false })

  if (error) throw error
  return data
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get cross-project resource dashboard stats
 */
export async function getCrossProjectResourceDashboardStats(filters = {}) {
  try {
    const [allocations, capacityPlans, forecasts, utilization, conflicts] = await Promise.all([
      getCrossProjectAllocations(filters),
      getResourceCapacityPlans(filters),
      getResourceForecasts(filters),
      getCrossProjectUtilization(filters),
      getResourceConflicts({ ...filters, is_cross_project_conflict: true })
    ])

    // Calculate stats
    const activeAllocations = allocations.filter(a => a.allocation_status === 'active').length
    const plannedAllocations = allocations.filter(a => a.allocation_status === 'planned').length
    const totalAllocations = allocations.length

    const overCapacityPlans = capacityPlans.filter(p => p.is_over_capacity).length
    const approvedPlans = capacityPlans.filter(p => p.plan_status === 'approved').length

    const gaps = forecasts.filter(f => f.demand_supply_gap_count > 0).length
    const totalForecasts = forecasts.length

    const overUtilized = utilization.filter(u => u.utilization_status === 'over-utilized').length
    const underUtilized = utilization.filter(u => u.utilization_status === 'under-utilized').length
    const optimalUtilized = utilization.filter(u => u.utilization_status === 'optimal').length

    const unresolvedConflicts = conflicts.filter(c => c.conflict_status !== 'resolved').length
    const criticalConflicts = conflicts.filter(c => c.conflict_severity === 'critical').length

    return {
      allocations: {
        total: totalAllocations,
        active: activeAllocations,
        planned: plannedAllocations,
      },
      capacityPlans: {
        total: capacityPlans.length,
        overCapacity: overCapacityPlans,
        approved: approvedPlans,
      },
      forecasts: {
        total: totalForecasts,
        withGaps: gaps,
      },
      utilization: {
        overUtilized,
        underUtilized,
        optimal: optimalUtilized,
        total: utilization.length,
      },
      conflicts: {
        total: conflicts.length,
        unresolved: unresolvedConflicts,
        critical: criticalConflicts,
      }
    }
  } catch (error) {
    console.error('Error getting cross-project resource dashboard stats:', error)
    throw error
  }
}

