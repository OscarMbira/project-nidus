import { supabase } from './supabaseClient'

/**
 * Quality Management Service - API functions for Quality Management module
 */

// ================================================
// QUALITY REGISTER
// ================================================

/**
 * Get all quality register items
 */
export async function getQualityRegister(filters = {}) {
  let query = supabase
    .from('quality_register')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        project_status
      ),
      quality_owner:quality_owner_user_id (id, email, full_name),
      sign_off_by:sign_off_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.quality_status) {
    query = query.eq('quality_status', filters.quality_status)
  }

  if (filters.product_type) {
    query = query.eq('product_type', filters.product_type)
  }

  if (filters.search) {
    query = query.or(`product_name.ilike.%${filters.search}%,product_reference.ilike.%${filters.search}%,product_description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single quality register item by ID
 */
export async function getQualityRegisterItem(itemId) {
  const { data, error } = await supabase
    .from('quality_register')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_owner:quality_owner_user_id (id, email, full_name),
      sign_off_by:sign_off_by_user_id (id, email, full_name)
    `)
    .eq('id', itemId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a quality register item
 */
export async function saveQualityRegisterItem(itemData, itemId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...itemData,
    updated_by: user.id,
  }

  if (itemId) {
    const { data, error } = await supabase
      .from('quality_register')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('quality_register')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a quality register item (soft delete)
 */
export async function deleteQualityRegisterItem(itemId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('quality_register')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// QUALITY REVIEWS
// ================================================

/**
 * Get all quality reviews
 */
export async function getQualityReviews(filters = {}) {
  let query = supabase
    .from('quality_reviews')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      chair:chair_user_id (id, email, full_name),
      secretary:secretary_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.quality_register_id) {
    query = query.eq('quality_register_id', filters.quality_register_id)
  }

  if (filters.review_status) {
    query = query.eq('review_status', filters.review_status)
  }

  const { data, error } = await query.order('planned_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single quality review by ID
 */
export async function getQualityReview(reviewId) {
  const { data, error } = await supabase
    .from('quality_reviews')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      chair:chair_user_id (id, email, full_name),
      secretary:secretary_user_id (id, email, full_name)
    `)
    .eq('id', reviewId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a quality review
 */
export async function saveQualityReview(reviewData, reviewId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...reviewData,
    updated_by: user.id,
  }

  if (reviewId) {
    const { data, error } = await supabase
      .from('quality_reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('quality_reviews')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a quality review (soft delete)
 */
export async function deleteQualityReview(reviewId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('quality_reviews')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// QUALITY INSPECTIONS
// ================================================

/**
 * Get all quality inspections
 */
export async function getQualityInspections(filters = {}) {
  let query = supabase
    .from('quality_inspections')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      inspector:inspector_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.quality_register_id) {
    query = query.eq('quality_register_id', filters.quality_register_id)
  }

  if (filters.inspection_status) {
    query = query.eq('inspection_status', filters.inspection_status)
  }

  const { data, error } = await query.order('inspection_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single quality inspection by ID
 */
export async function getQualityInspection(inspectionId) {
  const { data, error } = await supabase
    .from('quality_inspections')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      inspector:inspector_user_id (id, email, full_name)
    `)
    .eq('id', inspectionId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a quality inspection
 */
export async function saveQualityInspection(inspectionData, inspectionId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...inspectionData,
    updated_by: user.id,
  }

  if (inspectionId) {
    const { data, error } = await supabase
      .from('quality_inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('quality_inspections')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a quality inspection (soft delete)
 */
export async function deleteQualityInspection(inspectionId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('quality_inspections')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', inspectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// QUALITY DEFECTS
// ================================================

/**
 * Get all quality defects
 */
export async function getQualityDefects(filters = {}) {
  let query = supabase
    .from('quality_defects')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      reported_by:reported_by_user_id (id, email, full_name),
      assigned_to:assigned_to_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.quality_register_id) {
    query = query.eq('quality_register_id', filters.quality_register_id)
  }

  if (filters.defect_status) {
    query = query.eq('defect_status', filters.defect_status)
  }

  if (filters.severity) {
    query = query.eq('severity', filters.severity)
  }

  const { data, error } = await query.order('reported_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single quality defect by ID
 */
export async function getQualityDefect(defectId) {
  const { data, error } = await supabase
    .from('quality_defects')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      quality_register:quality_register_id (
        id,
        product_name,
        product_reference
      ),
      reported_by:reported_by_user_id (id, email, full_name),
      assigned_to:assigned_to_user_id (id, email, full_name)
    `)
    .eq('id', defectId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a quality defect
 */
export async function saveQualityDefect(defectData, defectId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...defectData,
    updated_by: user.id,
  }

  if (defectId) {
    const { data, error } = await supabase
      .from('quality_defects')
      .update(updateData)
      .eq('id', defectId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.reported_by_user_id) {
      updateData.reported_by_user_id = user.id
    }
    const { data, error } = await supabase
      .from('quality_defects')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a quality defect (soft delete)
 */
export async function deleteQualityDefect(defectId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('quality_defects')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', defectId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// QUALITY CRITERIA TEMPLATES
// ================================================

/**
 * Get all quality criteria templates
 */
export async function getQualityCriteriaTemplates(filters = {}) {
  let query = supabase
    .from('quality_criteria_templates')
    .select(`
      *,
      owner:owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.template_category) {
    query = query.eq('template_category', filters.template_category)
  }

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const { data, error } = await query.order('template_name', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create or update a quality criteria template
 */
export async function saveQualityCriteriaTemplate(templateData, templateId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...templateData,
    updated_by: user.id,
  }

  if (templateId) {
    const { data, error } = await supabase
      .from('quality_criteria_templates')
      .update(updateData)
      .eq('id', templateId)
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
      .from('quality_criteria_templates')
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
 * Get quality management dashboard stats
 */
export async function getQualityManagementStats(filters = {}) {
  try {
    const [registerItems, reviews, inspections, defects] = await Promise.all([
      getQualityRegister(filters),
      getQualityReviews(filters),
      getQualityInspections(filters),
      getQualityDefects(filters),
    ])

    const stats = {
      totalRegisterItems: registerItems.length,
      passedItems: registerItems.filter(item => item.quality_status === 'passed' || item.quality_status === 'approved').length,
      failedItems: registerItems.filter(item => item.quality_status === 'failed').length,
      pendingItems: registerItems.filter(item => item.quality_status === 'pending' || item.quality_status === 'in-review').length,
      totalReviews: reviews.length,
      completedReviews: reviews.filter(r => r.review_status === 'completed').length,
      totalInspections: inspections.length,
      totalDefects: defects.length,
      openDefects: defects.filter(d => d.defect_status === 'open' || d.defect_status === 'in-progress').length,
      criticalDefects: defects.filter(d => d.severity === 'critical').length,
      averageQualityScore: registerItems.filter(item => item.quality_score !== null).length > 0
        ? registerItems
            .filter(item => item.quality_score !== null)
            .reduce((sum, item) => sum + (parseFloat(item.quality_score) || 0), 0) /
          registerItems.filter(item => item.quality_score !== null).length
        : 0,
    }

    return stats
  } catch (error) {
    console.error('Error getting quality management stats:', error)
    throw error
  }
}

// ================================================
// QUALITY ACTIVITIES (UNIFIED VIEW)
// ================================================

/**
 * Get all quality activities (unified view of reviews and inspections)
 */
export async function getQualityActivities(projectId, filters = {}) {
  try {
    // Query the unified view
    let query = supabase
      .from('quality_activities_view')
      .select('*')
      .eq('project_id', projectId)

    // Apply filters
    if (filters.activity_type) {
      query = query.eq('activity_type', filters.activity_type)
    }

    if (filters.quality_method) {
      query = query.eq('quality_method', filters.quality_method)
    }

    if (filters.result) {
      query = query.eq('result', filters.result)
    }

    if (filters.is_reassessment !== undefined) {
      query = query.eq('is_reassessment', filters.is_reassessment)
    }

    if (filters.search) {
      query = query.or(`activity_identifier.ilike.%${filters.search}%,product_title.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting quality activities:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get quality activity by identifier
 */
export async function getActivityByIdentifier(identifier) {
  try {
    // Try reviews first
    let { data: review, error: reviewError } = await supabase
      .from('quality_reviews')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        quality_register:quality_register_id(id, product_name, product_reference),
        chair:chair_user_id(id, email, full_name),
        secretary:secretary_user_id(id, email, full_name)
      `)
      .eq('activity_identifier', identifier)
      .eq('is_deleted', false)
      .single()

    if (review && !reviewError) {
      return { success: true, data: { ...review, activity_type: 'review' } }
    }

    // Try inspections
    const { data: inspection, error: inspectionError } = await supabase
      .from('quality_inspections')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        quality_register:quality_register_id(id, product_name, product_reference),
        inspector:inspector_user_id(id, email, full_name)
      `)
      .eq('activity_identifier', identifier)
      .eq('is_deleted', false)
      .single()

    if (inspection && !inspectionError) {
      return { success: true, data: { ...inspection, activity_type: 'inspection' } }
    }

    if (reviewError && inspectionError) {
      throw new Error('Activity not found')
    }

    return { success: false, error: 'Activity not found' }
  } catch (error) {
    console.error('Error getting activity by identifier:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create reassessment for a failed quality activity
 */
export async function createReassessment(activityType, activityId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user ID from users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userRecord) {
      throw new Error('User record not found')
    }

    const { data, error } = await supabase.rpc('create_quality_reassessment', {
      p_activity_type: activityType,
      p_activity_id: activityId,
      p_user_id: userRecord.id
    })

    if (error) throw error

    return { success: true, data: { new_activity_id: data } }
  } catch (error) {
    console.error('Error creating reassessment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Link quality activity to QMS method
 */
export async function linkToQMSMethod(activityType, activityId, qmsMethodId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const tableName = activityType === 'review' ? 'quality_reviews' : 'quality_inspections'
    const { data, error } = await supabase
      .from(tableName)
      .update({
        qms_method_id: qmsMethodId,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error linking to QMS method:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create quality activity from QMS scheduled activity
 */
export async function createActivityFromScheduled(scheduledActivityId, activityType = 'review') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get scheduled activity
    const { data: scheduled, error: scheduledError } = await supabase
      .from('qms_scheduled_activities')
      .select(`
        *,
        qms_method:qms_method_id(*),
        qms:qms_id(project_id)
      `)
      .eq('id', scheduledActivityId)
      .single()

    if (scheduledError || !scheduled) {
      throw new Error('Scheduled activity not found')
    }

    // Create activity based on type
    if (activityType === 'review') {
      const { data, error } = await supabase
        .from('quality_reviews')
        .insert({
          project_id: scheduled.qms.project_id,
          qms_id: scheduled.qms_id,
          qms_method_id: scheduled.qms_method_id,
          qms_scheduled_activity_id: scheduled.id,
          review_title: scheduled.activity_name || 'Quality Review',
          review_type: scheduled.qms_method?.method_name?.toLowerCase().replace(/\s+/g, '-') || 'peer-review',
          planned_date: scheduled.planned_date || new Date().toISOString().split('T')[0],
          review_status: 'planned'
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } else if (activityType === 'inspection') {
      const { data, error } = await supabase
        .from('quality_inspections')
        .insert({
          project_id: scheduled.qms.project_id,
          qms_id: scheduled.qms_id,
          qms_method_id: scheduled.qms_method_id,
          qms_scheduled_activity_id: scheduled.id,
          inspection_title: scheduled.activity_name || 'Quality Inspection',
          inspection_type: scheduled.qms_method?.method_name?.toLowerCase().replace(/\s+/g, '-') || 'process',
          inspection_date: scheduled.planned_date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    throw new Error('Invalid activity type')
  } catch (error) {
    console.error('Error creating activity from scheduled:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update scheduled activity status when quality activity is completed
 */
export async function updateScheduledActivityStatus(activityType, activityId, newStatus = 'completed') {
  try {
    // Get the activity to find its scheduled activity ID
    const tableName = activityType === 'review' ? 'quality_reviews' : 'quality_inspections'
    const { data: activity, error: activityError } = await supabase
      .from(tableName)
      .select('qms_scheduled_activity_id, review_outcome, inspection_result')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      throw new Error('Activity not found')
    }

    if (!activity.qms_scheduled_activity_id) {
      return { success: true, message: 'No scheduled activity linked' }
    }

    // Determine status from outcome
    let status = newStatus
    if (activityType === 'review' && activity.review_outcome) {
      status = activity.review_outcome === 'passed' ? 'completed' : 'in_progress'
    } else if (activityType === 'inspection' && activity.inspection_result) {
      status = activity.inspection_result === 'passed' ? 'completed' : 'in_progress'
    }

    // Update scheduled activity
    const { error } = await supabase
      .from('qms_scheduled_activities')
      .update({
        status: status,
        actual_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', activity.qms_scheduled_activity_id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating scheduled activity status:', error)
    return { success: false, error: error.message }
  }
}

export default {
  // Quality Register
  getQualityRegister,
  getQualityRegisterItem,
  saveQualityRegisterItem,
  deleteQualityRegisterItem,
  
  // Quality Reviews
  getQualityReviews,
  getQualityReview,
  saveQualityReview,
  deleteQualityReview,
  
  // Quality Inspections
  getQualityInspections,
  getQualityInspection,
  saveQualityInspection,
  deleteQualityInspection,
  
  // Quality Defects
  getQualityDefects,
  getQualityDefect,
  saveQualityDefect,
  deleteQualityDefect,
  
  // Quality Criteria Templates
  getQualityCriteriaTemplates,
  saveQualityCriteriaTemplate,
  
  // Quality Activities (Unified)
  getQualityActivities,
  getActivityByIdentifier,
  createReassessment,
  linkToQMSMethod,
  createActivityFromScheduled,
  updateScheduledActivityStatus,
  
  // Dashboard
  getQualityManagementStats,
}

