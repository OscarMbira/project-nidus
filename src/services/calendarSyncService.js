/**
 * Calendar Sync Service
 * Handles calendar synchronization with Microsoft 365, Google Workspace, and other providers
 */

import { supabase } from './supabaseClient'

/**
 * Sync tasks to calendar
 */
export async function syncTasksToCalendar(userId, provider = 'google') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's tasks assigned to them or owned by them
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .eq('is_deleted', false)
      .not('due_date', 'is', null)

    if (tasksError) throw tasksError

    if (!tasks || tasks.length === 0) {
      return { success: true, data: { synced: 0 }, message: 'No tasks to sync' }
    }

    // Convert tasks to calendar events based on provider
    const events = tasks.map(task => ({
      title: task.task_name,
      description: task.description || '',
      start: task.due_date,
      end: task.due_date ? new Date(new Date(task.due_date).getTime() + 3600000).toISOString() : null, // 1 hour default
      allDay: false,
      location: '',
      calendarId: `task_${task.id}`
    }))

    let synced = 0
    if (provider === 'google') {
      // Sync with Google Calendar
      const result = await syncToGoogleCalendar(userId, events)
      if (result.success) synced = result.data?.synced || 0
    } else if (provider === 'microsoft365') {
      // Sync with Microsoft 365 Calendar
      const result = await syncToMicrosoft365Calendar(userId, events)
      if (result.success) synced = result.data?.synced || 0
    }

    // Log sync
    await logCalendarSync(userId, provider, 'tasks', synced)

    return { success: true, data: { synced }, message: `Synced ${synced} tasks to ${provider} calendar` }
  } catch (error) {
    console.error('Error syncing tasks to calendar:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Sync milestones to calendar
 */
export async function syncMilestonesToCalendar(userId, projectId = null, provider = 'google') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('milestones')
      .select('*, projects(project_name)')
      .eq('is_deleted', false)
      .not('milestone_date', 'is', null)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: milestones, error: milestonesError } = await query

    if (milestonesError) throw milestonesError

    if (!milestones || milestones.length === 0) {
      return { success: true, data: { synced: 0 }, message: 'No milestones to sync' }
    }

    // Convert milestones to calendar events
    const events = milestones.map(milestone => ({
      title: `${milestone.milestone_name} - ${milestone.projects?.project_name || ''}`,
      description: milestone.description || '',
      start: milestone.milestone_date,
      end: milestone.milestone_date,
      allDay: true,
      location: '',
      calendarId: `milestone_${milestone.id}`
    }))

    let synced = 0
    if (provider === 'google') {
      const result = await syncToGoogleCalendar(userId, events)
      if (result.success) synced = result.data?.synced || 0
    } else if (provider === 'microsoft365') {
      const result = await syncToMicrosoft365Calendar(userId, events)
      if (result.success) synced = result.data?.synced || 0
    }

    // Log sync
    await logCalendarSync(userId, provider, 'milestones', synced)

    return { success: true, data: { synced }, message: `Synced ${synced} milestones to ${provider} calendar` }
  } catch (error) {
    console.error('Error syncing milestones to calendar:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(userId, provider, eventData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (provider === 'google') {
      return await createGoogleCalendarEvent(userId, eventData)
    } else if (provider === 'microsoft365') {
      return await createMicrosoft365CalendarEvent(userId, eventData)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(userId, provider, eventId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (provider === 'google') {
      return await updateGoogleCalendarEvent(userId, eventId, updates)
    } else if (provider === 'microsoft365') {
      return await updateMicrosoft365CalendarEvent(userId, eventId, updates)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(userId, provider, eventId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (provider === 'google') {
      return await deleteGoogleCalendarEvent(userId, eventId)
    } else if (provider === 'microsoft365') {
      return await deleteMicrosoft365CalendarEvent(userId, eventId)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Sync to Google Calendar (placeholder - would use googleWorkspaceService)
 */
async function syncToGoogleCalendar(userId, events) {
  // In production, this would use the Google Calendar API via googleWorkspaceService
  // For now, return success
  return { success: true, data: { synced: events.length } }
}

/**
 * Sync to Microsoft 365 Calendar (placeholder - would use microsoft365Service)
 */
async function syncToMicrosoft365Calendar(userId, events) {
  // In production, this would use the Microsoft Graph API via microsoft365Service
  // For now, return success
  return { success: true, data: { synced: events.length } }
}

/**
 * Create Google Calendar event (placeholder)
 */
async function createGoogleCalendarEvent(userId, eventData) {
  // In production, this would create an event via Google Calendar API
  return { success: true, data: { eventId: `google_${Date.now()}` } }
}

/**
 * Create Microsoft 365 Calendar event (placeholder)
 */
async function createMicrosoft365CalendarEvent(userId, eventData) {
  // In production, this would create an event via Microsoft Graph API
  return { success: true, data: { eventId: `m365_${Date.now()}` } }
}

/**
 * Update Google Calendar event (placeholder)
 */
async function updateGoogleCalendarEvent(userId, eventId, updates) {
  // In production, this would update an event via Google Calendar API
  return { success: true, message: 'Event updated successfully' }
}

/**
 * Update Microsoft 365 Calendar event (placeholder)
 */
async function updateMicrosoft365CalendarEvent(userId, eventId, updates) {
  // In production, this would update an event via Microsoft Graph API
  return { success: true, message: 'Event updated successfully' }
}

/**
 * Delete Google Calendar event (placeholder)
 */
async function deleteGoogleCalendarEvent(userId, eventId) {
  // In production, this would delete an event via Google Calendar API
  return { success: true, message: 'Event deleted successfully' }
}

/**
 * Delete Microsoft 365 Calendar event (placeholder)
 */
async function deleteMicrosoft365CalendarEvent(userId, eventId) {
  // In production, this would delete an event via Microsoft Graph API
  return { success: true, message: 'Event deleted successfully' }
}

/**
 * Log calendar sync
 */
async function logCalendarSync(userId, provider, syncType, itemsSynced) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const tableName = provider === 'google' ? 'google_calendar_sync_logs' : 'outlook_sync_logs'
    
    await supabase.from(tableName).insert({
      user_id: userId,
      sync_type: syncType === 'tasks' ? 'calendar' : 'calendar',
      sync_status: 'success',
      items_synced: itemsSynced,
      last_sync_at: new Date().toISOString(),
      created_by: user.id
    })
  } catch (error) {
    console.error('Error logging calendar sync:', error)
  }
}

