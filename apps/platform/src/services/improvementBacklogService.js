/**
 * Improvement Backlog Service
 * Handles improvement tracking and management
 */

import { supabase } from './supabaseClient'

/**
 * Create improvement item
 */
export async function createImprovement(userId, improvementData) {
  try {
    const { data, error } = await supabase
      .from('improvement_backlog')
      .insert({
        title: improvementData.title,
        description: improvementData.description,
        improvement_type: improvementData.improvement_type || 'enhancement',
        impact_score: improvementData.impact_score || 0,
        effort_score: improvementData.effort_score || 0,
        status: improvementData.status || 'backlog',
        assigned_to: improvementData.assigned_to,
        source_type: improvementData.source_type,
        source_id: improvementData.source_id,
        related_feedback_id: improvementData.related_feedback_id,
        related_bug_id: improvementData.related_bug_id,
        related_feature_request_id: improvementData.related_feature_request_id,
        planned_release: improvementData.planned_release,
        target_completion_date: improvementData.target_completion_date,
        estimated_hours: improvementData.estimated_hours,
        tags: improvementData.tags || []
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating improvement:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get improvement backlog
 */
export async function getImprovementBacklog(filters = {}) {
  try {
    let query = supabase
      .from('improvement_backlog')
      .select(`
        *,
        assigned_user:assigned_to (id, full_name, email),
        created_user:created_by (id, full_name, email)
      `)
      .eq('is_deleted', false)
      .order('priority_score', { ascending: false, nullsLast: true })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.improvement_type) {
      query = query.eq('improvement_type', filters.improvement_type)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching improvement backlog:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Update improvement
 */
export async function updateImprovement(improvementId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Calculate completion date if status is completed
    if (updates.status === 'completed' && !updates.actual_completion_date) {
      updateData.actual_completion_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('improvement_backlog')
      .update(updateData)
      .eq('id', improvementId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating improvement:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get improvement statistics
 */
export async function getImprovementStats(filters = {}) {
  try {
    let query = supabase
      .from('improvement_backlog')
      .select('status, improvement_type, impact_score, effort_score, estimated_hours, actual_hours')
      .eq('is_deleted', false)

    if (filters.start_date && filters.end_date) {
      query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data.length,
      by_status: {},
      by_type: {},
      total_estimated_hours: 0,
      total_actual_hours: 0,
      avg_impact_score: 0,
      avg_effort_score: 0,
      avg_priority_score: 0
    }

    let totalImpact = 0
    let totalEffort = 0
    let totalPriority = 0
    let priorityCount = 0

    data.forEach(improvement => {
      // Count by status
      stats.by_status[improvement.status] = (stats.by_status[improvement.status] || 0) + 1

      // Count by type
      stats.by_type[improvement.improvement_type] = (stats.by_type[improvement.improvement_type] || 0) + 1

      // Calculate hours
      if (improvement.estimated_hours) {
        stats.total_estimated_hours += parseFloat(improvement.estimated_hours)
      }
      if (improvement.actual_hours) {
        stats.total_actual_hours += parseFloat(improvement.actual_hours)
      }

      // Calculate averages
      if (improvement.impact_score) {
        totalImpact += improvement.impact_score
      }
      if (improvement.effort_score) {
        totalEffort += improvement.effort_score
      }
      if (improvement.impact_score && improvement.effort_score && improvement.effort_score > 0) {
        totalPriority += improvement.impact_score / improvement.effort_score
        priorityCount++
      }
    })

    if (data.length > 0) {
      stats.avg_impact_score = Math.round(totalImpact / data.length)
      stats.avg_effort_score = Math.round(totalEffort / data.length)
    }

    if (priorityCount > 0) {
      stats.avg_priority_score = Math.round((totalPriority / priorityCount) * 100)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching improvement stats:', error)
    return { success: false, message: error.message, data: null }
  }
}

