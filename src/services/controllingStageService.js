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
 * Get work package by ID with all related data
 */
export async function getWorkPackageById(wpId) {
  try {
    const { data, error } = await supabase
      .from('work_packages')
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email),
        stage_boundary:stage_boundary_id(id, stage_name, gate_name),
        project:project_id(id, project_name, project_code),
        authorization_user:authorization_by(id, full_name, email),
        acceptance_user:acceptance_by(id, full_name, email)
      `)
      .eq('id', wpId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching work package:', error)
    throw error
  }
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
export async function authorizeWorkPackage(wpId, userId = null, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('work_packages')
      .update({
        status: 'authorized',
        authorization_date: new Date().toISOString().split('T')[0],
        authorization_by: userId || userData.id,
        authorization_notes: notes,
        updated_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', wpId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Record acceptance
    await supabase.from('wp_acceptances').insert({
      work_package_id: wpId,
      acceptance_type: 'authorization',
      accepted_by: userId || userData.id,
      acceptance_date: new Date().toISOString().split('T')[0],
      acceptance_status: 'accepted',
      comments: notes
    })

    return data
  } catch (error) {
    console.error('Error authorizing work package:', error)
    throw error
  }
}

/**
 * Accept a work package
 */
export async function acceptWorkPackage(wpId, userId = null, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('work_packages')
      .update({
        status: 'accepted',
        acceptance_date: new Date().toISOString().split('T')[0],
        acceptance_by: userId || userData.id,
        acceptance_notes: notes,
        updated_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', wpId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Record acceptance
    await supabase.from('wp_acceptances').insert({
      work_package_id: wpId,
      acceptance_type: 'acceptance',
      accepted_by: userId || userData.id,
      acceptance_date: new Date().toISOString().split('T')[0],
      acceptance_status: 'accepted',
      comments: notes
    })

    return data
  } catch (error) {
    console.error('Error accepting work package:', error)
    throw error
  }
}

/**
 * Complete a work package
 */
export async function completeWorkPackage(wpId, userId = null, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('work_packages')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        completion_notes: notes,
        updated_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', wpId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Record acceptance
    await supabase.from('wp_acceptances').insert({
      work_package_id: wpId,
      acceptance_type: 'completion',
      accepted_by: userId || userData.id,
      acceptance_date: new Date().toISOString().split('T')[0],
      acceptance_status: 'accepted',
      comments: notes
    })

    return data
  } catch (error) {
    console.error('Error completing work package:', error)
    throw error
  }
}

/**
 * Close a work package
 */
export async function closeWorkPackage(wpId, userId = null, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('work_packages')
      .update({
        status: 'closed',
        closed_date: new Date().toISOString().split('T')[0],
        closure_notes: notes,
        updated_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', wpId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Record acceptance
    await supabase.from('wp_acceptances').insert({
      work_package_id: wpId,
      acceptance_type: 'closure',
      accepted_by: userId || userData.id,
      acceptance_date: new Date().toISOString().split('T')[0],
      acceptance_status: 'accepted',
      comments: notes
    })

    return data
  } catch (error) {
    console.error('Error closing work package:', error)
    throw error
  }
}

/**
 * Update work package progress
 */
export async function updateProgress(wpId, progressPercentage, progressNotes, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    // Determine progress indicator
    let progressIndicator = 'on_track'
    const { data: wp } = await supabase
      .from('work_packages')
      .select('planned_end_date, forecast_end_date')
      .eq('id', wpId)
      .single()

    if (wp) {
      const today = new Date()
      const plannedEnd = wp.planned_end_date ? new Date(wp.planned_end_date) : null
      const forecastEnd = wp.forecast_end_date ? new Date(wp.forecast_end_date) : null

      if (forecastEnd && plannedEnd) {
        if (forecastEnd > plannedEnd) {
          progressIndicator = 'delayed'
        } else if (forecastEnd < plannedEnd) {
          progressIndicator = 'ahead_of_schedule'
        }
      } else if (plannedEnd && today > plannedEnd && progressPercentage < 100) {
        progressIndicator = 'delayed'
      }
    }

    const { data, error } = await supabase
      .from('work_packages')
      .update({
        progress_percentage: progressPercentage,
        progress_indicator: progressIndicator,
        last_progress_update: new Date().toISOString().split('T')[0],
        updated_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', wpId)
      .select()
      .single()

    if (error) throw error

    // Create progress snapshot
    await supabase.from('wp_progress_snapshots').insert({
      work_package_id: wpId,
      snapshot_date: new Date().toISOString().split('T')[0],
      progress_percentage: progressPercentage,
      progress_indicator: progressIndicator,
      progress_notes: progressNotes,
      created_by: userData.id
    })

    return data
  } catch (error) {
    console.error('Error updating progress:', error)
    throw error
  }
}

/**
 * Update work package
 */
export async function updateWorkPackage(wpId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('work_packages')
      .update(updateData)
      .eq('id', wpId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, full_name, email),
        stage_boundary:stage_boundary_id(id, stage_name, gate_name)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating work package:', error)
    throw error
  }
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
 * Resolve current user's users.id from auth
 */
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: u } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!u) throw new Error('User not found')
  return u.id
}

/**
 * Create highlight report
 */
export async function createHighlightReport(projectId, reportData, stageBoundaryId = null) {
  const userId = await getCurrentUserId()
  const insertData = {
    ...reportData,
    project_id: projectId,
    stage_boundary_id: stageBoundaryId || reportData.stage_boundary_id || null,
    prepared_by_user_id: userId,
    created_by: userId,
    updated_by: userId,
    status: reportData.status || 'draft',
    approval_workflow_status: reportData.approval_workflow_status || 'draft',
  }
  const { data, error } = await supabase
    .from('highlight_reports')
    .insert(insertData)
    .select(`*, prepared_by:prepared_by_user_id (id, email, full_name)`)
    .single()
  if (error) throw error
  return data
}

/**
 * Update highlight report
 */
export async function updateHighlightReport(reportId, updates) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('highlight_reports')
    .update({ ...updates, updated_by: userId })
    .eq('id', reportId)
    .select(`*, prepared_by:prepared_by_user_id (id, email, full_name)`)
    .single()
  if (error) throw error
  return data
}

/**
 * Delete highlight report (soft delete)
 */
export async function deleteHighlightReport(reportId) {
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('highlight_reports')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      updated_by: userId,
    })
    .eq('id', reportId)
  if (error) throw error
}

/**
 * Get highlight report by ID
 */
export async function getHighlightReportById(reportId) {
  const { data, error } = await supabase
    .from('highlight_reports')
    .select(`*, prepared_by:prepared_by_user_id (id, email, full_name)`)
    .eq('id', reportId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

/**
 * Get latest highlight report for project/stage
 */
export async function getLatestHighlightReport(projectId, stageBoundaryId = null) {
  try {
    const { data, error } = await supabase.rpc('get_latest_highlight_report', {
      p_project_id: projectId,
      p_stage_boundary_id: stageBoundaryId,
    })
    if (error) throw error
    if (!data || (Array.isArray(data) && data.length === 0)) return null
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.report_id) return null
    return getHighlightReportById(row.report_id)
  } catch (e) {
    console.warn('get_latest_highlight_report RPC failed, falling back to query', e)
    let q = supabase
      .from('highlight_reports')
      .select(`*, prepared_by:prepared_by_user_id (id, email, full_name)`)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
    if (stageBoundaryId) q = q.eq('stage_boundary_id', stageBoundaryId)
    const { data } = await q.maybeSingle()
    return data || null
  }
}

/**
 * Generate report reference (HLR-PROJ-STAGEn-NNN)
 * @param {string} projectId - Project UUID
 * @param {string|null} stageBoundaryId - Stage boundary UUID (optional)
 * @param {string} [reportDate] - Report date YYYY-MM-DD (optional)
 */
export async function generateReportReference(projectId, stageBoundaryId = null, reportDate = null) {
  try {
    const { data, error } = await supabase.rpc('generate_highlight_report_reference', {
      p_project_id: projectId,
      p_stage_boundary_id: stageBoundaryId,
      p_report_date: reportDate || new Date().toISOString().split('T')[0],
    })
    if (error) throw error
    return data
  } catch (e) {
    console.warn('generate_highlight_report_reference RPC failed', e)
    return null
  }
}

/**
 * Validate report completeness
 */
export async function validateReportCompleteness(reportId) {
  const { data, error } = await supabase.rpc('validate_highlight_report_completeness', {
    p_report_id: reportId,
  })
  if (error) throw error
  return data || []
}

/**
 * Auto-populate from stage (progress, tolerances)
 */
export async function autoPopulateFromStage(reportId, stageBoundaryId) {
  const { error } = await supabase.rpc('auto_populate_highlight_report_from_stage', {
    p_report_id: reportId,
    p_stage_boundary_id: stageBoundaryId,
  })
  if (error) throw error
}

/**
 * Calculate tolerance status for report
 */
export async function calculateToleranceStatus(reportId) {
  const { error } = await supabase.rpc('calculate_tolerance_status_for_report', {
    p_report_id: reportId,
  })
  if (error) throw error
}

/**
 * Get report statistics
 */
export async function getReportStatistics(projectId, startDate = null, endDate = null) {
  const { data, error } = await supabase.rpc('get_report_statistics', {
    p_project_id: projectId,
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw error
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { total_reports: 0, average_status: 'on_track', tolerance_breaches_count: 0, escalation_count: 0 }
  }
  return Array.isArray(data) ? data[0] : data
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

