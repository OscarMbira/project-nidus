/**
 * Feedback Service
 * Handles user feedback collection and management.
 * Uses platform (public schema) user_feedback table.
 */

import { platformDb } from './supabase/supabaseClient'

function buildBrowserInfo() {
  if (typeof navigator === 'undefined') return {}
  return {
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
  }
}

function isRpcUnavailableError(error) {
  const code = error?.code
  const msg = String(error?.message || error?.details || '')
  if (code === 'PGRST202') return true
  if (/could not find the function|function public\.submit_user_feedback does not exist/i.test(msg)) return true
  return false
}

/**
 * Direct REST insert — may fail with 403 if RLS blocks public.users or user_feedback (see SQL v467/v468).
 */
/** REST insert — no screenshot column required (screenshots only via RPC v468). */
async function submitFeedbackViaRest(feedbackType, feedbackText, rating, pageUrl) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) {
    return { success: false, message: 'You must be logged in to submit feedback' }
  }

  const { data: profile, error: profileError } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[feedback] resolve users.id:', profileError)
    return { success: false, message: profileError.message || 'Could not load your user profile.' }
  }
  if (!profile?.id) {
    return {
      success: false,
      message: 'Your account profile was not found. Complete onboarding or contact support.',
    }
  }

  const { data, error } = await platformDb
    .from('user_feedback')
    .insert({
      user_id: profile.id,
      feedback_type: feedbackType,
      feedback_text: feedbackText,
      rating,
      page_url: pageUrl || (typeof window !== 'undefined' ? window.location.href : null),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      browser_info: buildBrowserInfo(),
      status: 'new',
    })
    .select()
    .single()

  if (error) throw error

  return { success: true, data }
}

/**
 * Submit user feedback.
 * Prefer DB RPC `submit_user_feedback` (SQL v468) — avoids client 403 on users SELECT / insert when RLS is tight.
 * Falls back to REST insert when the RPC is not deployed yet.
 */
export async function submitFeedback(
  _userId,
  feedbackType,
  feedbackText,
  rating = null,
  pageUrl = null,
  screenshotData = null
) {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) {
      return { success: false, message: 'You must be logged in to submit feedback' }
    }

    const browserInfo = buildBrowserInfo()

    const { data: rpcId, error: rpcError } = await platformDb.rpc('submit_user_feedback', {
      p_feedback_type: feedbackType,
      p_feedback_text: feedbackText,
      p_rating: rating,
      p_page_url: pageUrl || (typeof window !== 'undefined' ? window.location.href : null),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_browser_info: browserInfo,
      p_screenshot_data: screenshotData || null,
    })

    if (!rpcError && rpcId) {
      return { success: true, data: { id: rpcId } }
    }

    if (rpcError && !isRpcUnavailableError(rpcError)) {
      const msg =
        rpcError.message ||
        rpcError.details ||
        'Could not submit feedback. Try again or contact support.'
      console.error('[feedback] submit_user_feedback RPC:', rpcError)
      return { success: false, message: msg }
    }

    if (rpcError) {
      console.warn('[feedback] RPC not available, falling back to REST insert:', rpcError.message)
    }

    if (screenshotData) {
      console.warn('[feedback] Screenshot dropped: apply SQL v468 (submit_user_feedback RPC) to store attachments.')
    }
    return await submitFeedbackViaRest(feedbackType, feedbackText, rating, pageUrl)
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

