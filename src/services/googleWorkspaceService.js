/**
 * Google Workspace Integration Service
 * Handles integration with Gmail, Google Calendar, and Google Drive
 */

import { supabase } from './supabaseClient'

// Google APIs base URL
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1'
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3'
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3'

/**
 * Initiate Google Workspace OAuth flow
 */
export async function initiateGoogleWorkspaceOAuth(redirectUri) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ')

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `access_type=offline&` +
    `prompt=consent`

  return { success: true, authUrl }
}

/**
 * Complete Google Workspace OAuth and save connection
 */
export async function completeGoogleWorkspaceOAuth(authCode, redirectUri) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
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

    // Get user profile
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      }
    )

    const profile = await profileResponse.json()

    // Calculate token expiration
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // Save connection
    const { data: connection, error } = await supabase
      .from('google_connections')
      .upsert({
        user_id: user.id,
        google_user_id: profile.id,
        email: profile.email,
        access_token: tokens.access_token, // Should be encrypted in production
        refresh_token: tokens.refresh_token, // Should be encrypted in production
        token_expires_at: expiresAt.toISOString(),
        connected_services: ['gmail', 'calendar', 'drive'],
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
      message: 'Google Workspace connected successfully'
    }
  } catch (error) {
    console.error('Error completing Google Workspace OAuth:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get Google Workspace connection for current user
 */
export async function getGoogleWorkspaceConnection() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('google_connections')
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
      const refreshResult = await refreshGoogleToken(data.id, data.refresh_token)
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
    console.error('Error fetching Google Workspace connection:', error)
    return { success: false, message: error.message, connected: false }
  }
}

/**
 * Refresh Google access token
 */
async function refreshGoogleToken(connectionId, refreshToken) {
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
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
      .from('google_connections')
      .update({
        access_token: tokens.access_token,
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
    .from('google_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error('Google Workspace not connected')

  // Check if token is expired
  const isExpired = new Date(connection.token_expires_at) <= new Date()

  if (isExpired) {
    const refreshResult = await refreshGoogleToken(connection.id, connection.refresh_token)
    if (!refreshResult.success) throw new Error('Failed to refresh token')
    return refreshResult.data.access_token
  }

  return connection.access_token
}

/**
 * Send email via Gmail
 */
export async function sendGmailNotification(emailData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Create email message
    const email = [
      `To: ${emailData.to_email}`,
      `Subject: ${emailData.subject}`,
      '',
      emailData.message_body
    ].join('\n')

    // Encode email in base64
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send email
    const response = await fetch(
      `${GMAIL_API_URL}/users/me/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to send Gmail: ${response.statusText}`)
    }

    const sentMessage = await response.json()

    // Log the notification
    await supabase
      .from('gmail_notifications')
      .insert({
        user_id: user.id,
        project_id: emailData.project_id || null,
        to_email: emailData.to_email,
        subject: emailData.subject,
        message_body: emailData.message_body,
        message_id: sentMessage.id,
        thread_id: sentMessage.threadId,
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
        created_by: user.id
      })

    return {
      success: true,
      data: sentMessage,
      message: 'Email sent successfully via Gmail'
    }
  } catch (error) {
    console.error('Error sending Gmail:', error)

    // Log failed attempt
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('gmail_notifications')
          .insert({
            user_id: user.id,
            project_id: emailData.project_id || null,
            to_email: emailData.to_email,
            subject: emailData.subject,
            message_body: emailData.message_body,
            delivery_status: 'failed',
            error_message: error.message,
            created_by: user.id
          })
      }
    } catch (logError) {
      console.error('Error logging failed Gmail:', logError)
    }

    return { success: false, message: error.message }
  }
}

/**
 * Sync Google Calendar events
 */
export async function syncGoogleCalendar(options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('google_calendar_sync_logs')
      .insert({
        user_id: user.id,
        sync_direction: options.direction || 'bidirectional',
        sync_status: 'in_progress',
        created_by: user.id
      })
      .select()
      .single()

    if (logError) throw logError

    let eventsSynced = 0
    let eventsFailed = 0

    try {
      // Fetch calendar events from Google Calendar
      const response = await fetch(
        `${CALENDAR_API_URL}/calendars/primary/events?maxResults=50&orderBy=updated`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`)
      }

      const data = await response.json()

      // Sync each event
      for (const event of data.items || []) {
        try {
          await syncGoogleCalendarEvent(event, user.id, syncLog.id)
          eventsSynced++
        } catch (syncError) {
          eventsFailed++
          console.error('Error syncing event:', syncError)
        }
      }

      // Update sync log
      await supabase
        .from('google_calendar_sync_logs')
        .update({
          sync_status: 'success',
          events_synced: eventsSynced,
          events_failed: eventsFailed,
          last_sync_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)

      return {
        success: true,
        data: { synced: eventsSynced, failed: eventsFailed },
        message: `Synced ${eventsSynced} calendar events`
      }
    } catch (syncError) {
      // Update sync log with failure
      await supabase
        .from('google_calendar_sync_logs')
        .update({
          sync_status: 'failed',
          error_log: syncError.message
        })
        .eq('id', syncLog.id)

      throw syncError
    }
  } catch (error) {
    console.error('Error syncing Google Calendar:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Sync a single Google Calendar event
 */
async function syncGoogleCalendarEvent(googleEvent, userId, syncLogId) {
  // Check if event already synced
  const { data: existingEvent } = await supabase
    .from('google_calendar_events')
    .select('*')
    .eq('google_event_id', googleEvent.id)
    .eq('user_id', userId)
    .single()

  const eventData = {
    user_id: userId,
    google_event_id: googleEvent.id,
    calendar_id: googleEvent.organizer?.email || 'primary',
    event_summary: googleEvent.summary || 'No title',
    event_start: googleEvent.start?.dateTime || googleEvent.start?.date,
    event_end: googleEvent.end?.dateTime || googleEvent.end?.date,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString()
  }

  if (existingEvent) {
    // Update existing event
    await supabase
      .from('google_calendar_events')
      .update(eventData)
      .eq('id', existingEvent.id)
  } else {
    // Create new event record
    await supabase
      .from('google_calendar_events')
      .insert({ ...eventData, created_by: userId })
  }
}

/**
 * Create Google Calendar event from task
 */
export async function createGoogleEventFromTask(taskId) {
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
      summary: task.task_name,
      description: task.description || '',
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
      `${CALENDAR_API_URL}/calendars/primary/events`,
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
      .from('google_calendar_events')
      .insert({
        user_id: user.id,
        task_id: taskId,
        google_event_id: createdEvent.id,
        calendar_id: 'primary',
        event_summary: createdEvent.summary,
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
    console.error('Error creating Google Calendar event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Link Google Drive file to project/task
 */
export async function linkGoogleDriveFile(fileData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const accessToken = await getValidAccessToken()

    // Get file metadata from Google Drive
    const response = await fetch(
      `${DRIVE_API_URL}/files/${fileData.drive_file_id}?fields=id,name,mimeType,size,webViewLink,thumbnailLink`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch Drive file: ${response.statusText}`)
    }

    const driveFile = await response.json()

    // Create file link record
    const { data, error } = await supabase
      .from('google_drive_files')
      .insert({
        user_id: user.id,
        project_id: fileData.project_id || null,
        task_id: fileData.task_id || null,
        drive_file_id: driveFile.id,
        file_name: driveFile.name,
        file_url: driveFile.webViewLink,
        mime_type: driveFile.mimeType,
        file_size: parseInt(driveFile.size) || null,
        thumbnail_url: driveFile.thumbnailLink,
        shared_with_team: fileData.shared_with_team || false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Google Drive file linked successfully'
    }
  } catch (error) {
    console.error('Error linking Google Drive file:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get linked Google Drive files
 */
export async function getGoogleDriveFiles(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('google_drive_files')
      .select('*')
      .eq('is_deleted', false)

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.task_id) {
      query = query.eq('task_id', filters.task_id)
    }

    if (!filters.include_private) {
      query = query.or(`user_id.eq.${user.id},shared_with_team.eq.true`)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching Google Drive files:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get Gmail notification history
 */
export async function getGmailNotifications(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('gmail_notifications')
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
    console.error('Error fetching Gmail notifications:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get Google Calendar sync logs
 */
export async function getGoogleCalendarSyncLogs(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('google_calendar_sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(filters.limit || 20)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching Google Calendar sync logs:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Disconnect Google Workspace
 */
export async function disconnectGoogleWorkspace() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('google_connections')
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
      message: 'Google Workspace disconnected successfully'
    }
  } catch (error) {
    console.error('Error disconnecting Google Workspace:', error)
    return { success: false, message: error.message }
  }
}
