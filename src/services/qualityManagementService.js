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
  
  // Dashboard
  getQualityManagementStats,
}

