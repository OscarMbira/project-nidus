/**
 * Help Service
 * Handles help articles, categories, feedback, and guided tours
 */

import { supabase } from './supabaseClient'

/**
 * Get help articles
 */
export async function getHelpArticles(filters = {}) {
  try {
    let query = supabase
      .from('help_articles')
      .select('*, help_categories:category_id(id, category_name, slug, icon, color)')
      .eq('is_deleted', false)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters.role) {
      query = query.in('role', [filters.role, 'all'])
    }

    if (filters.methodology) {
      query = query.in('methodology', [filters.methodology, 'all'])
    }

    if (filters.featured) {
      query = query.eq('featured', true)
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching help articles:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get help article by ID or slug
 */
export async function getHelpArticle(identifier) {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    
    let query = supabase
      .from('help_articles')
      .select('*, help_categories:category_id(id, category_name, slug, icon, color)')
      .eq('is_deleted', false)
      .eq('is_published', true)

    if (isUUID) {
      query = query.eq('id', identifier)
    } else {
      query = query.eq('slug', identifier)
    }

    const { data, error } = await query.single()

    if (error) throw error

    // Record view
    if (data) {
      recordArticleView(data.id).catch(console.error)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching help article:', error)
    return { success: false, message: error.message, data: null }
  }
}

/**
 * Search help articles
 */
export async function searchHelpArticles(query, filters = {}) {
  try {
    return await getHelpArticles({
      ...filters,
      search: query
    })
  } catch (error) {
    console.error('Error searching help articles:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get help categories
 */
export async function getHelpCategories() {
  try {
    const { data, error } = await supabase
      .from('help_categories')
      .select('*')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching help categories:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get featured articles
 */
export async function getFeaturedArticles(limit = 5) {
  try {
    return await getHelpArticles({
      featured: true,
      limit
    })
  } catch (error) {
    console.error('Error fetching featured articles:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Record article view
 */
export async function recordArticleView(articleId, userId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const viewUserId = userId || user?.id

    const { error } = await supabase
      .from('help_article_views')
      .insert({
        article_id: articleId,
        user_id: viewUserId,
        viewed_at: new Date().toISOString(),
        ip_address: null, // Can be set server-side if needed
        user_agent: navigator.userAgent,
        session_id: sessionStorage.getItem('session_id') || null
      })

    if (error) throw error

    // Increment view count
    await supabase.rpc('increment_help_article_view_count', { article_id: articleId })

    return { success: true }
  } catch (error) {
    console.error('Error recording article view:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Submit help article feedback
 */
export async function submitHelpFeedback(articleId, userId, feedbackType, feedbackText = null, rating = null) {
  try {
    const { data, error } = await supabase
      .from('help_feedback')
      .insert({
        article_id: articleId,
        user_id: userId,
        feedback_type: feedbackType, // helpful, not_helpful, comment
        feedback_text: feedbackText,
        rating: rating
      })
      .select()
      .single()

    if (error) throw error

    // Update article helpful count
    if (feedbackType === 'helpful') {
      await supabase.rpc('increment_help_article_helpful_count', { article_id: articleId })
    } else if (feedbackType === 'not_helpful') {
      await supabase.rpc('increment_help_article_not_helpful_count', { article_id: articleId })
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error submitting help feedback:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get guided tour by key
 */
export async function getGuidedTour(tourKey) {
  try {
    const { data, error } = await supabase
      .from('guided_tours')
      .select('*')
      .eq('tour_key', tourKey)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching guided tour:', error)
    return { success: false, message: error.message, data: null }
  }
}

/**
 * Get guided tours for page
 */
export async function getGuidedToursForPage(pagePath, role = null) {
  try {
    let query = supabase
      .from('guided_tours')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (pagePath) {
      query = query.eq('target_page', pagePath)
    }

    if (role) {
      query = query.in('target_role', [role, 'all'])
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching guided tours:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Complete guided tour
 */
export async function completeGuidedTour(userId, tourId, stepsCompleted = 0, skipped = false, completionTimeSeconds = 0) {
  try {
    const { data, error } = await supabase
      .from('user_tour_completions')
      .upsert({
        user_id: userId,
        tour_id: tourId,
        completed_at: new Date().toISOString(),
        steps_completed: stepsCompleted,
        skipped: skipped,
        completion_time_seconds: completionTimeSeconds
      }, {
        onConflict: 'user_id,tour_id'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error completing guided tour:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get user tour completions
 */
export async function getUserTourCompletions(userId) {
  try {
    const { data, error } = await supabase
      .from('user_tour_completions')
      .select('*, guided_tours:tour_id(id, tour_key, tour_name)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching user tour completions:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Check if user has completed tour
 */
export async function hasUserCompletedTour(userId, tourId) {
  try {
    const { data, error } = await supabase
      .from('user_tour_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('tour_id', tourId)
      .maybeSingle()

    if (error) throw error

    return { success: true, completed: !!data }
  } catch (error) {
    console.error('Error checking tour completion:', error)
    return { success: false, completed: false }
  }
}

