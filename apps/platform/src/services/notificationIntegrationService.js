/**
 * Notification Integration Service
 * Unified service for managing notifications across Slack, Teams, email, and webhooks
 */

import { supabase } from './supabaseClient'

/**
 * Connect to Slack workspace
 */
export async function connectSlack(oauthData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('slack_connections')
      .upsert({
        user_id: user.id,
        workspace_id: oauthData.team.id,
        workspace_name: oauthData.team.name,
        team_id: oauthData.team.id,
        access_token: oauthData.access_token, // Should be encrypted in production
        bot_access_token: oauthData.bot_user_id ? oauthData.access_token : null,
        webhook_url: oauthData.incoming_webhook?.url || null,
        app_id: oauthData.app_id,
        scope: oauthData.scope?.split(',') || [],
        is_active: true,
        created_by: user.id,
        updated_by: user.id
      }, {
        onConflict: 'workspace_id,user_id'
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Slack workspace connected successfully'
    }
  } catch (error) {
    console.error('Error connecting Slack:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get Slack connections
 */
export async function getSlackConnections() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .eq('is_active', true)

    if (error) throw error

    // Mask tokens
    const maskedData = data.map(conn => ({
      ...conn,
      access_token: '***********',
      bot_access_token: '***********'
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching Slack connections:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(notificationData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get Slack connection
    const { data: connection, error: connError } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('id', notificationData.slack_connection_id)
      .eq('user_id', user.id)
      .single()

    if (connError) throw connError

    if (!connection.is_active) {
      throw new Error('Slack connection is not active')
    }

    // Send message to Slack
    let response
    if (connection.webhook_url) {
      // Use webhook (simpler, no channel selection needed)
      response = await fetch(connection.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: notificationData.message,
          blocks: notificationData.message_blocks || null
        })
      })
    } else {
      // Use Web API
      response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.bot_access_token || connection.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: notificationData.channel_id,
          text: notificationData.message,
          blocks: notificationData.message_blocks || null
        })
      })
    }

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(`Slack error: ${result.error}`)
    }

    // Log the notification
    await supabase
      .from('slack_notifications')
      .insert({
        slack_connection_id: connection.id,
        user_id: user.id,
        project_id: notificationData.project_id || null,
        channel_id: notificationData.channel_id || null,
        channel_name: notificationData.channel_name || null,
        message: notificationData.message,
        message_blocks: notificationData.message_blocks,
        notification_type: notificationData.notification_type || 'manual',
        delivery_status: 'sent',
        slack_message_ts: result.ts || result.message?.ts,
        sent_at: new Date().toISOString(),
        created_by: user.id
      })

    return {
      success: true,
      data: result,
      message: 'Slack notification sent successfully'
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error)

    // Log failed attempt
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('slack_notifications')
          .insert({
            slack_connection_id: notificationData.slack_connection_id,
            user_id: user.id,
            project_id: notificationData.project_id || null,
            channel_id: notificationData.channel_id,
            message: notificationData.message,
            delivery_status: 'failed',
            error_message: error.message,
            created_by: user.id
          })
      }
    } catch (logError) {
      console.error('Error logging failed notification:', logError)
    }

    return { success: false, message: error.message }
  }
}

/**
 * Get notification templates
 */
export async function getNotificationTemplates(filters = {}) {
  try {
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('is_deleted', false)
      .eq('is_active', true)

    if (filters.template_type) {
      query = query.eq('template_type', filters.template_type)
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }

    const { data, error } = await query.order('template_name')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching notification templates:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Create notification rule
 */
export async function createNotificationRule(ruleData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notification_rules')
      .insert({
        project_id: ruleData.project_id || null,
        user_id: user.id,
        rule_name: ruleData.rule_name,
        event_type: ruleData.event_type,
        notification_channel: ruleData.notification_channel,
        channel_config: ruleData.channel_config,
        filters: ruleData.filters || {},
        priority: ruleData.priority || 0,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Notification rule created successfully'
    }
  } catch (error) {
    console.error('Error creating notification rule:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get notification rules
 */
export async function getNotificationRules(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('notification_rules')
      .select(`
        *,
        projects(project_name)
      `)
      .eq('is_deleted', false)

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }

    const { data, error } = await query.order('priority', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching notification rules:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Update notification rule
 */
export async function updateNotificationRule(ruleId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notification_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Notification rule updated successfully' }
  } catch (error) {
    console.error('Error updating notification rule:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Delete notification rule
 */
export async function deleteNotificationRule(ruleId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notification_rules')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Notification rule deleted successfully' }
  } catch (error) {
    console.error('Error deleting notification rule:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Trigger notification based on event
 * This is the central function that routes notifications to appropriate channels
 */
export async function triggerNotification(eventType, eventData, options = {}) {
  try {
    // Get all active notification rules for this event type
    let query = supabase
      .from('notification_rules')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (eventData.project_id) {
      query = query.or(`project_id.eq.${eventData.project_id},project_id.is.null`)
    }

    const { data: rules, error } = await query.order('priority', { ascending: false })

    if (error) throw error

    if (!rules || rules.length === 0) {
      return {
        success: true,
        message: `No active notification rules for event: ${eventType}`
      }
    }

    // Apply filters and send notifications
    const results = []
    for (const rule of rules) {
      // Check if event data matches rule filters
      if (!matchesFilters(eventData, rule.filters)) {
        continue
      }

      // Get template if configured
      let message = eventData.message || `Event triggered: ${eventType}`
      if (rule.channel_config.template_id) {
        const template = await getTemplate(rule.channel_config.template_id)
        if (template) {
          message = interpolateTemplate(template.template_body, eventData)
        }
      }

      // Send notification based on channel
      let result
      switch (rule.notification_channel) {
        case 'slack':
          result = await sendSlackNotification({
            slack_connection_id: rule.channel_config.slack_connection_id,
            channel_id: rule.channel_config.channel_id,
            message: message,
            notification_type: eventType,
            project_id: eventData.project_id
          })
          break

        case 'teams':
          // Import and use Microsoft 365 service
          const { sendTeamsMessage } = await import('./microsoft365Service.js')
          result = await sendTeamsMessage({
            team_id: rule.channel_config.team_id,
            channel_id: rule.channel_config.channel_id,
            message: message,
            notification_type: eventType,
            project_id: eventData.project_id
          })
          break

        case 'email':
          // Import and use email service
          const { sendEmail } = await import('./emailIntegrationService.js')
          result = await sendEmail({
            to_email: rule.channel_config.to_email,
            subject: rule.channel_config.subject || `Notification: ${eventType}`,
            body_html: message,
            project_id: eventData.project_id
          })
          break

        case 'webhook':
          // Import and use webhook service
          const { triggerWebhookEvent } = await import('./webhookService.js')
          result = await triggerWebhookEvent(eventType, eventData, eventData.project_id)
          break

        default:
          result = { success: false, message: `Unknown notification channel: ${rule.notification_channel}` }
      }

      results.push({
        rule_id: rule.id,
        channel: rule.notification_channel,
        result: result
      })
    }

    return {
      success: true,
      data: results,
      message: `Triggered ${results.length} notification(s) for event: ${eventType}`
    }
  } catch (error) {
    console.error('Error triggering notification:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Check if event data matches rule filters
 */
function matchesFilters(eventData, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return true
  }

  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (!value.includes(eventData[key])) {
        return false
      }
    } else if (eventData[key] !== value) {
      return false
    }
  }

  return true
}

/**
 * Get template by ID
 */
async function getTemplate(templateId) {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) return null
  return data
}

/**
 * Interpolate template with event data
 */
function interpolateTemplate(template, data) {
  let result = template

  // Replace {{variable}} placeholders
  const regex = /\{\{(\w+)\}\}/g
  result = result.replace(regex, (match, variable) => {
    return data[variable] !== undefined ? data[variable] : match
  })

  return result
}

/**
 * Get Slack notification history
 */
export async function getSlackNotifications(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('slack_notifications')
      .select('*')

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (filters.delivery_status) {
      query = query.eq('delivery_status', filters.delivery_status)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching Slack notifications:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Disconnect Slack workspace
 */
export async function disconnectSlack(connectionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('slack_connections')
      .update({
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (error) throw error

    return {
      success: true,
      message: 'Slack workspace disconnected successfully'
    }
  } catch (error) {
    console.error('Error disconnecting Slack:', error)
    return { success: false, message: error.message }
  }
}
