/**
 * Support Ticket Service
 * Handles support ticket creation, management, and tracking
 */

import { supabase } from './supabaseClient'

/**
 * Create a new support ticket
 */
export async function createSupportTicket(userId, ticketData) {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: ticketData.subject,
        description: ticketData.description,
        ticket_type: ticketData.ticket_type || 'general',
        category: ticketData.category,
        priority: ticketData.priority || 'medium',
        severity: ticketData.severity || 'medium',
        page_url: ticketData.page_url || window.location.href,
        browser_info: JSON.stringify(ticketData.browser_info || {
          platform: navigator.platform,
          language: navigator.language,
          userAgent: navigator.userAgent
        }),
        device_info: ticketData.device_info,
        screenshot_url: ticketData.screenshot_url,
        related_bug_id: ticketData.related_bug_id,
        related_feedback_id: ticketData.related_feedback_id,
        related_feature_request_id: ticketData.related_feature_request_id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get support tickets for user or admin
 */
export async function getSupportTickets(filters = {}) {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id (id, full_name, email),
        assigned_user:assigned_to (id, full_name, email),
        resolved_user:resolved_by (id, full_name, email),
        closed_user:closed_by (id, full_name, email)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.ticket_type) {
      query = query.eq('ticket_type', filters.ticket_type)
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get a single support ticket with comments
 */
export async function getSupportTicket(ticketId) {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id (id, full_name, email),
        assigned_user:assigned_to (id, full_name, email),
        resolved_user:resolved_by (id, full_name, email),
        closed_user:closed_by (id, full_name, email)
      `)
      .eq('id', ticketId)
      .eq('is_deleted', false)
      .single()

    if (ticketError) throw ticketError

    const { data: comments, error: commentsError } = await supabase
      .from('support_ticket_comments')
      .select(`
        *,
        user:user_id (id, full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (commentsError) throw commentsError

    return { success: true, data: { ...ticket, comments: comments || [] } }
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(ticketId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Handle status changes
    if (updates.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = updates.userId
    }

    if (updates.status === 'closed') {
      updateData.closed_at = new Date().toISOString()
      updateData.closed_by = updates.userId
    }

    if (updates.assigned_to) {
      updateData.assigned_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Add comment to support ticket
 */
export async function addTicketComment(ticketId, userId, commentText, isInternal = false) {
  try {
    const { data, error } = await supabase
      .from('support_ticket_comments')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        comment_text: commentText,
        is_internal: isInternal,
        comment_type: 'comment'
      })
      .select()
      .single()

    if (error) throw error

    // Update ticket's first_response_at if this is the first response from support
    const { data: { user } } = await supabase.auth.getUser()
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_id, roles!inner(role_name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (roles && roles.length > 0) {
      const isAdmin = roles.some(r => r.roles?.role_name === 'system_admin' || r.roles?.role_name === 'project_manager')
      if (isAdmin) {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('first_response_at')
          .eq('id', ticketId)
          .single()

        if (!ticket.first_response_at) {
          const responseTime = Math.round((new Date() - new Date(ticket.created_at)) / 60000) // minutes
          await supabase
            .from('support_tickets')
            .update({
              first_response_at: new Date().toISOString(),
              first_response_by: userId,
              first_response_time: responseTime,
              status: 'open'
            })
            .eq('id', ticketId)
        }
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error adding ticket comment:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get support ticket statistics
 */
export async function getSupportTicketStats(filters = {}) {
  try {
    let query = supabase
      .from('support_tickets')
      .select('status, priority, ticket_type, created_at, first_response_time, resolution_time')
      .eq('is_deleted', false)

    if (filters.start_date && filters.end_date) {
      query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data.length,
      by_status: {},
      by_priority: {},
      by_type: {},
      avg_response_time: 0,
      avg_resolution_time: 0,
      sla_met: 0,
      sla_missed: 0
    }

    let totalResponseTime = 0
    let responseTimeCount = 0
    let totalResolutionTime = 0
    let resolutionTimeCount = 0

    data.forEach(ticket => {
      // Count by status
      stats.by_status[ticket.status] = (stats.by_status[ticket.status] || 0) + 1

      // Count by priority
      stats.by_priority[ticket.priority] = (stats.by_priority[ticket.priority] || 0) + 1

      // Count by type
      stats.by_type[ticket.ticket_type] = (stats.by_type[ticket.ticket_type] || 0) + 1

      // Calculate average response time
      if (ticket.first_response_time) {
        totalResponseTime += ticket.first_response_time
        responseTimeCount++
      }

      // Calculate average resolution time
      if (ticket.resolution_time) {
        totalResolutionTime += ticket.resolution_time
        resolutionTimeCount++
      }

      // Check SLA compliance
      if (ticket.first_response_time && ticket.response_time_sla_minutes) {
        if (ticket.first_response_time <= ticket.response_time_sla_minutes) {
          stats.sla_met++
        } else {
          stats.sla_missed++
        }
      }
    })

    if (responseTimeCount > 0) {
      stats.avg_response_time = Math.round(totalResponseTime / responseTimeCount)
    }

    if (resolutionTimeCount > 0) {
      stats.avg_resolution_time = Math.round(totalResolutionTime / resolutionTimeCount)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching support ticket stats:', error)
    return { success: false, message: error.message, data: null }
  }
}
