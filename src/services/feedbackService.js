/**
 * Feedback Service
 * Handles user feedback collection and management.
 * Uses platform (public schema) user_feedback table.
 */

import { platformDb } from './supabase/supabaseClient'

/**
 * Submit user feedback.
 * Uses the current session's user id for the insert so RLS (auth.uid() = user_id) passes.
 */
export async function submitFeedback(userId, feedbackType, feedbackText, rating = null, pageUrl = null) {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) {
      return { success: false, message: 'You must be logged in to submit feedback' }
    }
    // Use session user id so RLS policy (auth.uid() = user_id) is satisfied
    const insertUserId = user.id

    const { data, error } = await platformDb
      .from('user_feedback')
      .insert({
        user_id: insertUserId,
        feedback_type: feedbackType,
        feedback_text: feedbackText,
        rating: rating,
        page_url: pageUrl || (typeof window !== 'undefined' ? window.location.href : null),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        browser_info: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : null,
          language: typeof navigator !== 'undefined' ? navigator.language : null,
          cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : null
        },
        status: 'new'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return { success: false, message: error?.message || 'Failed to submit feedback' }
  }
}

/**
 * Get feedback list (admin only)
 */
export async function getFeedback(filters = {}) {
  try {
    let query = platformDb
      .from('user_feedback')
      .select('*, users:user_id(id, email, full_name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (filters.feedback_type) {
      query = query.eq('feedback_type', filters.feedback_type)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.start_date && filters.end_date) {
      query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(feedbackId, status, resolutionNotes = null, assignedTo = null) {
  try {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    }

    if (resolutionNotes) {
      updates.resolution_notes = resolutionNotes
    }

    if (assignedTo) {
      updates.assigned_to = assignedTo
    }

    const { data, error } = await platformDb
      .from('user_feedback')
      .update(updates)
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating feedback status:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get feedback statistics
 */
export async function getFeedbackStats(filters = {}) {
  try {
    let query = platformDb
      .from('user_feedback')
      .select('feedback_type, status, rating')
      .eq('is_deleted', false)

    if (filters.start_date && filters.end_date) {
      query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data.length,
      by_type: {},
      by_status: {},
      average_rating: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }

    let totalRating = 0
    let ratingCount = 0

    data.forEach(feedback => {
      // Count by type
      stats.by_type[feedback.feedback_type] = (stats.by_type[feedback.feedback_type] || 0) + 1

      // Count by status
      stats.by_status[feedback.status] = (stats.by_status[feedback.status] || 0) + 1

      // Calculate average rating
      if (feedback.rating) {
        totalRating += feedback.rating
        ratingCount++
        stats.rating_distribution[feedback.rating] = (stats.rating_distribution[feedback.rating] || 0) + 1
      }
    })

    if (ratingCount > 0) {
      stats.average_rating = totalRating / ratingCount
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching feedback stats:', error)
    return { success: false, message: error.message, data: null }
  }
}

