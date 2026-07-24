import { platformDb } from './supabase/supabaseClient'

/**
 * Dependency Service - API functions for Inter-Project Dependencies module
 */

// ================================================
// INTER-PROJECT DEPENDENCIES
// ================================================

/**
 * Get all inter-project dependencies
 */
export async function getInterProjectDependencies(filters = {}) {
  let query = platformDb
    .from('inter_project_dependencies')
    .select(`
      *,
      source_project:source_project_id (
        id,
        project_name,
        project_code,
        status_id,
        planned_start_date,
        planned_end_date
      ),
      target_project:target_project_id (
        id,
        project_name,
        project_code,
        status_id,
        planned_start_date,
        planned_end_date
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
      dependency_owner:dependency_owner_user_id (id, email, full_name),
      required_resource:required_resource_id (
        id,
        resource_name,
        resource_code
      )
    `)
    .eq('is_deleted', false)

  if (filters.source_project_id) {
    query = query.eq('source_project_id', filters.source_project_id)
  }

  if (filters.target_project_id) {
    query = query.eq('target_project_id', filters.target_project_id)
  }

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.dependency_type) {
    query = query.eq('dependency_type', filters.dependency_type)
  }

  if (filters.dependency_status) {
    query = query.eq('dependency_status', filters.dependency_status)
  }

  if (filters.dependency_criticality) {
    query = query.eq('dependency_criticality', filters.criticality)
  }

  if (filters.is_critical_path !== undefined) {
    query = query.eq('is_critical_path', filters.is_critical_path)
  }

  if (filters.search) {
    query = query.or(`dependency_name.ilike.%${filters.search}%,dependency_code.ilike.%${filters.search}%,dependency_description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('dependency_criticality', { ascending: false }).order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single dependency by ID
 */
export async function getInterProjectDependency(dependencyId) {
  const { data, error } = await platformDb
    .from('inter_project_dependencies')
    .select(`
      *,
      source_project:source_project_id (
        id,
        project_name,
        project_code,
        status_id,
        planned_start_date,
        planned_end_date
      ),
      target_project:target_project_id (
        id,
        project_name,
        project_code,
        status_id,
        planned_start_date,
        planned_end_date
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
      dependency_owner:dependency_owner_user_id (id, email, full_name),
      required_resource:required_resource_id (
        id,
        resource_name,
        resource_code
      )
    `)
    .eq('id', dependencyId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update an inter-project dependency
 */
export async function saveInterProjectDependency(dependencyData, dependencyId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check for circular dependencies before saving
  if (!dependencyId && dependencyData.source_project_id && dependencyData.target_project_id) {
    const { data: circularCheck, error: checkError } = await platformDb.rpc('detect_circular_dependency', {
      p_source_project_id: dependencyData.source_project_id,
      p_target_project_id: dependencyData.target_project_id,
    })

    if (checkError) {
      console.warn('Circular dependency check failed:', checkError)
    } else if (circularCheck) {
      throw new Error('Adding this dependency would create a circular dependency')
    }
  }

  const updateData = {
    ...dependencyData,
    updated_by: user.id,
  }

  if (dependencyId) {
    const { data, error } = await platformDb
      .from('inter_project_dependencies')
      .update(updateData)
      .eq('id', dependencyId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.dependency_owner_user_id) {
      updateData.dependency_owner_user_id = user.id
    }
    if (!updateData.dependency_identified_date) {
      updateData.dependency_identified_date = new Date().toISOString().split('T')[0]
    }
    const { data, error } = await platformDb
      .from('inter_project_dependencies')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete an inter-project dependency (soft delete)
 */
export async function deleteInterProjectDependency(dependencyId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('inter_project_dependencies')
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
 * Check for circular dependencies
 */
export async function checkCircularDependency(sourceProjectId, targetProjectId) {
  const { data, error } = await platformDb.rpc('detect_circular_dependency', {
    p_source_project_id: sourceProjectId,
    p_target_project_id: targetProjectId,
  })

  if (error) throw error
  return data || false
}

// ================================================
// DEPENDENCY IMPACTS
// ================================================

/**
 * Get dependency impacts
 */
export async function getDependencyImpacts(dependencyId = null, filters = {}) {
  let query = platformDb
    .from('dependency_impacts')
    .select(`
      *,
      dependency:dependency_id (
        id,
        dependency_code,
        dependency_name,
        source_project:source_project_id (id, project_name, project_code),
        target_project:target_project_id (id, project_name, project_code)
      ),
      impact_assessor:impact_assessor_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (dependencyId) {
    query = query.eq('dependency_id', dependencyId)
  }

  if (filters.impact_type) {
    query = query.eq('impact_type', filters.impact_type)
  }

  if (filters.impact_severity) {
    query = query.eq('impact_severity', filters.impact_severity)
  }

  if (filters.impact_status) {
    query = query.eq('impact_status', filters.impact_status)
  }

  const { data, error } = await query.order('impact_severity', { ascending: false }).order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a dependency impact
 */
export async function saveDependencyImpact(impactData, impactId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...impactData,
    updated_by: user.id,
  }

  if (impactId) {
    const { data, error } = await platformDb
      .from('dependency_impacts')
      .update(updateData)
      .eq('id', impactId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.impact_assessor_user_id) {
      updateData.impact_assessor_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('dependency_impacts')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a dependency impact (soft delete)
 */
export async function deleteDependencyImpact(impactId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('dependency_impacts')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', impactId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DEPENDENCY RESOLUTIONS
// ================================================

/**
 * Get dependency resolutions
 */
export async function getDependencyResolutions(dependencyId = null, filters = {}) {
  let query = platformDb
    .from('dependency_resolutions')
    .select(`
      *,
      dependency:dependency_id (
        id,
        dependency_code,
        dependency_name,
        source_project:source_project_id (id, project_name, project_code),
        target_project:target_project_id (id, project_name, project_code)
      ),
      resolution_owner:resolution_owner_user_id (id, email, full_name),
      resolution_assignee:resolution_assignee_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (dependencyId) {
    query = query.eq('dependency_id', dependencyId)
  }

  if (filters.resolution_type) {
    query = query.eq('resolution_type', filters.resolution_type)
  }

  if (filters.resolution_status) {
    query = query.eq('resolution_status', filters.resolution_status)
  }

  if (filters.resolution_priority) {
    query = query.eq('resolution_priority', filters.resolution_priority)
  }

  const { data, error } = await query.order('resolution_priority', { ascending: false }).order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a dependency resolution
 */
export async function saveDependencyResolution(resolutionData, resolutionId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...resolutionData,
    updated_by: user.id,
  }

  if (resolutionId) {
    const { data, error } = await platformDb
      .from('dependency_resolutions')
      .update(updateData)
      .eq('id', resolutionId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.resolution_owner_user_id) {
      updateData.resolution_owner_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('dependency_resolutions')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a dependency resolution (soft delete)
 */
export async function deleteDependencyResolution(resolutionId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('dependency_resolutions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', resolutionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DEPENDENCY CRITICAL PATHS
// ================================================

/**
 * Get dependency critical paths
 */
export async function getDependencyCriticalPaths(filters = {}) {
  let query = platformDb
    .from('dependency_critical_paths')
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
      analyzed_by:analyzed_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters.path_status) {
    query = query.eq('path_status', filters.path_status)
  }

  const { data, error } = await query.order('analysis_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a dependency critical path
 */
export async function saveDependencyCriticalPath(pathData, pathId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...pathData,
    updated_by: user.id,
  }

  if (pathId) {
    const { data, error } = await platformDb
      .from('dependency_critical_paths')
      .update(updateData)
      .eq('id', pathId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.analyzed_by_user_id) {
      updateData.analyzed_by_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('dependency_critical_paths')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a dependency critical path (soft delete)
 */
export async function deleteDependencyCriticalPath(pathId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('dependency_critical_paths')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', pathId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get dependency dashboard stats
 */
export async function getDependencyDashboardStats(filters = {}) {
  try {
    const dependencies = await getInterProjectDependencies(filters)

    const stats = {
      total: dependencies.length,
      identified: dependencies.filter(d => d.dependency_status === 'identified').length,
      active: dependencies.filter(d => d.dependency_status === 'active').length,
      atRisk: dependencies.filter(d => d.dependency_status === 'at_risk').length,
      blocked: dependencies.filter(d => d.dependency_status === 'blocked').length,
      resolved: dependencies.filter(d => d.dependency_status === 'resolved').length,
      critical: dependencies.filter(d => d.dependency_criticality === 'critical').length,
      onCriticalPath: dependencies.filter(d => d.is_critical_path).length,
      byType: dependencies.reduce((acc, d) => {
        acc[d.dependency_type] = (acc[d.dependency_type] || 0) + 1
        return acc
      }, {}),
    }

    return stats
  } catch (error) {
    console.error('Error getting dependency dashboard stats:', error)
    throw error
  }
}

/**
 * Get dependencies for a specific project (both incoming and outgoing)
 */
export async function getProjectDependencies(projectId) {
  try {
    const [outgoing, incoming] = await Promise.all([
      getInterProjectDependencies({ source_project_id: projectId }),
      getInterProjectDependencies({ target_project_id: projectId }),
    ])

    return {
      outgoing: outgoing || [],
      incoming: incoming || [],
      total: (outgoing?.length || 0) + (incoming?.length || 0),
    }
  } catch (error) {
    console.error('Error getting project dependencies:', error)
    throw error
  }
}

