import { supabase } from './supabaseClient'

/**
 * Controlling Stage Service - API functions for Structured PM Controlling a Stage module
 */

/**
 * Get all work packages for a project
 */
export async function getWorkPackages(projectId, stageBoundaryId = null) {
  let query = supabase
    .from('work_packages')
    .select(`
      *,
      assigned_to:assigned_to_user_id (id, email, full_name),
      stage_boundary:stage_boundary_id (id, stage_name, gate_name)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (stageBoundaryId) {
    query = query.eq('stage_boundary_id', stageBoundaryId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single work package by ID
 */
export async function getWorkPackage(workPackageId) {
  const { data, error } = await supabase
    .from('work_packages')
    .select(`
      *,
      assigned_to:assigned_to_user_id (id, email, full_name),
      stage_boundary:stage_boundary_id (id, stage_name, gate_name)
    `)
    .eq('id', workPackageId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a work package
 */
export async function saveWorkPackage(workPackageData, workPackageId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...workPackageData,
    updated_by: user.id,
  }

  if (workPackageId) {
    // Update
    const { data, error } = await supabase
      .from('work_packages')
      .update(updateData)
      .eq('id', workPackageId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('work_packages')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Authorize a work package
 */
export async function authorizeWorkPackage(workPackageId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('work_packages')
    .update({
      status: 'authorized',
      authorization_date: new Date().toISOString().split('T')[0],
      authorization_by: user.id,
      updated_by: user.id,
    })
    .eq('id', workPackageId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get checkpoint reports for a project
 */
export async function getCheckpointReports(projectId, stageBoundaryId = null) {
  let query = supabase
    .from('checkpoint_reports')
    .select(`
      *,
      reported_by:reported_by_user_id (id, email, full_name)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (stageBoundaryId) {
    query = query.eq('stage_boundary_id', stageBoundaryId)
  }

  const { data, error } = await query.order('checkpoint_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get highlight reports for a project
 */
export async function getHighlightReports(projectId, stageBoundaryId = null) {
  let query = supabase
    .from('highlight_reports')
    .select(`
      *,
      prepared_by:prepared_by_user_id (id, email, full_name)
    `)
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (stageBoundaryId) {
    query = query.eq('stage_boundary_id', stageBoundaryId)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get stage tolerances for a project
 */
export async function getStageTolerances(projectId, stageBoundaryId = null) {
  let query = supabase
    .from('stage_tolerances')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (stageBoundaryId) {
    query = query.eq('stage_boundary_id', stageBoundaryId)
  }

  const { data, error } = await query.order('tolerance_type', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Update stage tolerance current value
 */
export async function updateToleranceValue(toleranceId, currentValue) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get tolerance to calculate variance
  const { data: tolerance, error: fetchError } = await supabase
    .from('stage_tolerances')
    .select('*')
    .eq('id', toleranceId)
    .single()

  if (fetchError) throw fetchError

  const value = parseFloat(currentValue) || 0
  const baselineValue = parseFloat(tolerance.baseline_value) || 0
  const limitValue = parseFloat(tolerance.tolerance_limit_value) || 0

  const variance = value - baselineValue
  const variancePercentage = baselineValue > 0 ? (variance / baselineValue) * 100 : 0
  const usagePercentage = limitValue > 0 ? (Math.abs(variance) / limitValue) * 100 : 0

  let status = 'within_tolerance'
  if (usagePercentage >= tolerance.exception_threshold_percentage) {
    status = 'exceeded_tolerance'
  } else if (usagePercentage >= tolerance.warning_threshold_percentage) {
    status = 'approaching_tolerance'
  }

  const { data, error } = await supabase
    .from('stage_tolerances')
    .update({
      current_value: value,
      variance: variance,
      variance_percentage: variancePercentage,
      status: status,
      status_date: new Date().toISOString().split('T')[0],
      last_checked_at: new Date().toISOString(),
      checked_by: user.id,
      updated_by: user.id,
    })
    .eq('id', toleranceId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get stage progress for a project
 */
export async function getStageProgress(projectId, stageBoundaryId = null) {
  let query = supabase
    .from('stage_progress')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)

  if (stageBoundaryId) {
    query = query.eq('stage_boundary_id', stageBoundaryId)
  }

  const { data, error } = await query.order('progress_date', { ascending: false })

  if (error) throw error
  return data
}

