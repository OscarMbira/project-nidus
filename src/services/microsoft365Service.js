/**
 * Microsoft 365 Integration Service
 * Handles integration with Microsoft Teams, Outlook, and Calendar
 */

import { supabase } from './supabaseClient'

// Microsoft Graph API base URL
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

/**
 * Initiate Microsoft 365 OAuth flow
 */
export async function initiateMicrosoft365OAuth(redirectUri) {
  // Get OAuth configuration from environment or database
  const clientId = import.meta.env.VITE_MICROSOFT365_CLIENT_ID
  const tenantId = import.meta.env.VITE_MICROSOFT365_TENANT_ID || 'common'

  const scopes = [
    'User.Read',
    'Mail.Send',
    'Calendars.ReadWrite',
    'ChannelMessage.Send',
    'offline_access'
  ].join(' ')

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_mode=query`

  return { success: true, authUrl }
}

/**
 * Complete Microsoft 365 OAuth and save connection
 */
export async function completeMicrosoft365OAuth(authCode, redirectUri) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const clientId = import.meta.env.VITE_MICROSOFT365_CLIENT_ID
    const clientSecret = import.meta.env.VITE_MICROSOFT365_CLIENT_SECRET
    const tenantId = import.meta.env.VITE_MICROSOFT365_TENANT_ID || 'common'

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authCode,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Calculate token expiration
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // Save connection
    const { data: connection, error } = await supabase
      .from('microsoft365_connections')
      .upsert({
        user_id: user.id,
        tenant_id: tenantId,
        access_token: tokens.access_token, // Should be encrypted in production
        refresh_token: tokens.refresh_token, // Should be encrypted in production
        token_expires_at: expiresAt.toISOString(),
        connected_services: ['teams', 'outlook', 'calendar'],
        is_active: true,
        created_by: user.id,
        updated_by: user.id
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: connection,
      message: 'Microsoft 365 connected successfully'
    }
  } catch (error) {
    console.error('Error completing Microsoft 365 OAuth:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get Microsoft 365 connection for current user
 */
export async function getMicrosoft365Connection() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('microsoft365_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!data) {
      return { success: true, data: null, connected: false }
    }

    // Check if token is expired
    const isExpired = new Date(data.token_expires_at) <= new Date()

    if (isExpired && data.refresh_token) {
      // Refresh the token
      const refreshResult = await refreshMicrosoft365Token(data.id, data.refresh_token)
      if (refreshResult.success) {
        return { success: true, data: refreshResult.data, connected: true }
      }
    }

    return {
      success: true,
      data: { ...data, access_token: '***', refresh_token: '***' },
      connected: !isExpired
    }
  } catch (error) {
    console.error('Error fetching Microsoft 365 connection:', error)
    return { success: false, message: error.message, connected: false }
  }
}

/**
 * Refresh Microsoft 365 access token
 */
async function refreshMicrosoft365Token(connectionId, refreshToken) {
  try {
    const clientId = import.meta.env.VITE_MICROSOFT365_CLIENT_ID
    const clientSecret = import.meta.env.VITE_MICROSOFT365_CLIENT_SECRET
    const tenantId = import.meta.env.VITE_MICROSOFT365_TENANT_ID || 'common'

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh token')
    }

    const tokens = await tokenResponse.json()

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    const { data, error } = await supabase
      .from('microsoft365_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: connection, error } = await supabase
    .from('microsoft365_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error('Microsoft 365 not connected')

  // Check if token is expired
  const isExpired = new Date(connection.token_expires_at) <= new Date()

  if (isExpired) {
    const refreshResult = await refreshMicrosoft365Token(connection.id, connection.refresh_token)
    if (!refreshResult.success) throw new Error('Failed to refresh token')
    return refreshResult.data.access_token
  }

  return connection.access_token
}

/**
 * Send message to Microsoft Teams channel
 */
export async function sendTeamsMessage(messageData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Send message to Teams channel
    const response = await fetch(
      `${GRAPH_API_URL}/teams/${messageData.team_id}/channels/${messageData.channel_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            content: messageData.message,
            contentType: messageData.message_type || 'text'
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to send Teams message: ${response.statusText}`)
    }

    const sentMessage = await response.json()

    // Log the notification
    await supabase
      .from('teams_notifications')
      .insert({
        user_id: user.id,
        project_id: messageData.project_id || null,
        channel_id: messageData.channel_id,
        channel_name: messageData.channel_name || null,
        team_id: messageData.team_id,
        message: messageData.message,
        message_type: messageData.message_type || 'text',
        notification_type: messageData.notification_type || 'manual',
        delivery_status: 'sent',
        teams_message_id: sentMessage.id,
        sent_at: new Date().toISOString(),
        created_by: user.id
      })

    return {
      success: true,
      data: sentMessage,
      message: 'Teams message sent successfully'
    }
  } catch (error) {
    console.error('Error sending Teams message:', error)

    // Log failed attempt
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('teams_notifications')
          .insert({
            user_id: user.id,
            project_id: messageData.project_id || null,
            channel_id: messageData.channel_id,
            team_id: messageData.team_id,
            message: messageData.message,
            delivery_status: 'failed',
            error_message: error.message,
            created_by: user.id
          })
      }
    } catch (logError) {
      console.error('Error logging failed Teams message:', logError)
    }

    return { success: false, message: error.message }
  }
}

/**
 * Sync Outlook calendar events
 */
export async function syncOutlookCalendar(options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('outlook_sync_logs')
      .insert({
        user_id: user.id,
        sync_type: 'calendar',
        sync_direction: options.direction || 'bidirectional',
        sync_status: 'in_progress',
        created_by: user.id
      })
      .select()
      .single()

    if (logError) throw logError

    let itemsSynced = 0
    let itemsFailed = 0

    try {
      // Fetch calendar events from Outlook
      const response = await fetch(
        `${GRAPH_API_URL}/me/calendar/events?$top=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`)
      }

      const data = await response.json()

      // Sync each event
      for (const event of data.value) {
        try {
          await syncCalendarEvent(event, user.id, syncLog.id)
          itemsSynced++
        } catch (syncError) {
          itemsFailed++
          console.error('Error syncing event:', syncError)
        }
      }

      // Update sync log
      await supabase
        .from('outlook_sync_logs')
        .update({
          sync_status: 'success',
          items_synced: itemsSynced,
          items_failed: itemsFailed,
          last_sync_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)

      return {
        success: true,
        data: { synced: itemsSynced, failed: itemsFailed },
        message: `Synced ${itemsSynced} calendar events`
      }
    } catch (syncError) {
      // Update sync log with failure
      await supabase
        .from('outlook_sync_logs')
        .update({
          sync_status: 'failed',
          error_log: syncError.message
        })
        .eq('id', syncLog.id)

      throw syncError
    }
  } catch (error) {
    console.error('Error syncing Outlook calendar:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Sync a single calendar event
 */
async function syncCalendarEvent(outlookEvent, userId, syncLogId) {
  // Check if event already synced
  const { data: existingEvent } = await supabase
    .from('outlook_calendar_events')
    .select('*')
    .eq('outlook_event_id', outlookEvent.id)
    .eq('user_id', userId)
    .single()

  const eventData = {
    user_id: userId,
    outlook_event_id: outlookEvent.id,
    event_subject: outlookEvent.subject,
    event_start: outlookEvent.start.dateTime,
    event_end: outlookEvent.end.dateTime,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString()
  }

  if (existingEvent) {
    // Update existing event
    await supabase
      .from('outlook_calendar_events')
      .update(eventData)
      .eq('id', existingEvent.id)
  } else {
    // Create new event record
    await supabase
      .from('outlook_calendar_events')
      .insert({ ...eventData, created_by: userId })
  }
}

/**
 * Create Outlook calendar event from task
 */
export async function createOutlookEventFromTask(taskId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError) throw taskError

    // Create calendar event
    const eventData = {
      subject: task.task_name,
      body: {
        contentType: 'HTML',
        content: task.description || ''
      },
      start: {
        dateTime: task.planned_start_date || new Date().toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: task.planned_end_date || new Date().toISOString(),
        timeZone: 'UTC'
      }
    }

    const response = await fetch(
      `${GRAPH_API_URL}/me/calendar/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create calendar event: ${response.statusText}`)
    }

    const createdEvent = await response.json()

    // Create mapping
    await supabase
      .from('outlook_calendar_events')
      .insert({
        user_id: user.id,
        task_id: taskId,
        outlook_event_id: createdEvent.id,
        event_subject: createdEvent.subject,
        event_start: createdEvent.start.dateTime,
        event_end: createdEvent.end.dateTime,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        created_by: user.id
      })

    return {
      success: true,
      data: createdEvent,
      message: 'Calendar event created successfully'
    }
  } catch (error) {
    console.error('Error creating Outlook event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get Teams notification history
 */
export async function getTeamsNotifications(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('teams_notifications')
      .select('*')
      .eq('user_id', user.id)

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
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
    console.error('Error fetching Teams notifications:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get Outlook sync logs
 */
export async function getOutlookSyncLogs(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('outlook_sync_logs')
      .select('*')
      .eq('user_id', user.id)

    if (filters.sync_type) {
      query = query.eq('sync_type', filters.sync_type)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 20)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching Outlook sync logs:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Disconnect Microsoft 365
 */
export async function disconnectMicrosoft365() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('microsoft365_connections')
      .update({
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('user_id', user.id)

    if (error) throw error

    return {
      success: true,
      message: 'Microsoft 365 disconnected successfully'
    }
  } catch (error) {
    console.error('Error disconnecting Microsoft 365:', error)
    return { success: false, message: error.message }
  }
}
