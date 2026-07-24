/**
 * Audit Service
 * Handles comprehensive audit logging, data access tracking, and audit configuration
 */

import { supabase } from './supabaseClient'

/**
 * Log audit event
 */
export async function logAuditEvent(eventType, userId, resourceType, resourceId, action, beforeState, afterState, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Determine event category
    const eventCategory = getEventCategory(eventType)
    const severity = getEventSeverity(eventType, action)

    // Calculate changes
    const changes = calculateChanges(beforeState, afterState)

    // Get request context
    const session = await supabase.auth.getSession()

    const auditData = {
      event_type: eventType,
      event_category: eventCategory,
      severity,
      user_id: userId || user?.id,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      before_state: beforeState,
      after_state: afterState,
      changes,
      ip_address: null, // Get from request in production
      user_agent: navigator.userAgent,
      session_id: session.data?.session?.access_token?.substring(0, 20),
      request_id: generateRequestId(),
      success: true,
      metadata,
      created_by: user?.id
    }

    const { data, error } = await supabase
      .from('audit_events')
      .insert(auditData)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error logging audit event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Log data access (GDPR requirement)
 */
export async function logDataAccess(userId, dataSubjectId, accessType, dataCategory, purpose) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('data_access_logs')
      .insert({
        user_id: userId || user?.id,
        data_subject_id: dataSubjectId,
        access_type: accessType,
        data_category: dataCategory,
        purpose,
        ip_address: null, // Get from request in production
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error logging data access:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Log authentication event
 */
export async function logAuthenticationEvent(userId, eventType, success, errorMessage = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    await logAuditEvent(
      eventType,
      userId,
      'authentication',
      userId,
      eventType,
      null,
      { success },
      { error_message: errorMessage }
    )

    return { success: true }
  } catch (error) {
    console.error('Error logging authentication event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Log authorization event
 */
export async function logAuthorizationEvent(userId, resource, action, success) {
  try {
    await logAuditEvent(
      success ? 'authorization.granted' : 'authorization.denied',
      userId,
      resource.type,
      resource.id,
      action,
      null,
      { success },
      { resource_type: resource.type, action }
    )

    return { success: true }
  } catch (error) {
    console.error('Error logging authorization event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Log configuration change
 */
export async function logConfigurationChange(userId, setting, oldValue, newValue) {
  try {
    await logAuditEvent(
      'configuration.changed',
      userId,
      'configuration',
      setting.id,
      'update',
      { [setting.key]: oldValue },
      { [setting.key]: newValue },
      { setting_key: setting.key }
    )

    return { success: true }
  } catch (error) {
    console.error('Error logging configuration change:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get audit trail
 */
export async function getAuditTrail(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type)
    }

    if (filters.resource_id) {
      query = query.eq('resource_id', filters.resource_id)
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }

    if (filters.event_category) {
      query = query.eq('event_category', filters.event_category)
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    if (filters.success !== undefined) {
      query = query.eq('success', filters.success)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Search audit log
 */
export async function searchAuditLog(searchTerm, filters = {}) {
  try {
    // Combine filters with search term
    const allFilters = {
      ...filters,
      search_term: searchTerm
    }

    // Use full-text search if available, otherwise filter client-side
    let query = supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply standard filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type)
    }

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter by search term client-side (in production, use full-text search)
    let filteredData = data || []
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filteredData = filteredData.filter(event => 
        event.event_type?.toLowerCase().includes(term) ||
        event.action?.toLowerCase().includes(term) ||
        event.resource_type?.toLowerCase().includes(term) ||
        JSON.stringify(event.metadata || {}).toLowerCase().includes(term)
      )
    }

    return { success: true, data: filteredData }
  } catch (error) {
    console.error('Error searching audit log:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Export audit log
 */
export async function exportAuditLog(filters, format = 'json') {
  try {
    const result = await getAuditTrail(filters)
    
    if (!result.success) {
      throw new Error(result.message)
    }

    const data = result.data

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(data, null, 2),
        format: 'json',
        filename: `audit_log_${new Date().toISOString().split('T')[0]}.json`
      }
    } else if (format === 'csv') {
      const csv = convertToCSV(data)
      return {
        success: true,
        data: csv,
        format: 'csv',
        filename: `audit_log_${new Date().toISOString().split('T')[0]}.csv`
      }
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }
  } catch (error) {
    console.error('Error exporting audit log:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Configure audit settings
 */
export async function configureAuditSettings(eventType, settings) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('audit_settings')
      .upsert({
        event_type: eventType,
        log_level: settings.log_level || 'basic',
        retention_days: settings.retention_days || 365,
        alert_on_event: settings.alert_on_event || false,
        alert_recipients: settings.alert_recipients || [],
        is_active: settings.is_active !== undefined ? settings.is_active : true,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }, {
        onConflict: 'event_type'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Audit settings updated' }
  } catch (error) {
    console.error('Error configuring audit settings:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get audit settings
 */
export async function getAuditSettings(eventType = null) {
  try {
    let query = supabase
      .from('audit_settings')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching audit settings:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Helper functions
 */
function getEventCategory(eventType) {
  if (eventType.includes('login') || eventType.includes('logout') || eventType.includes('auth')) {
    return 'authentication'
  } else if (eventType.includes('permission') || eventType.includes('authorization')) {
    return 'authorization'
  } else if (eventType.includes('config') || eventType.includes('setting')) {
    return 'configuration'
  } else {
    return 'data_access'
  }
}

function getEventSeverity(eventType, action) {
  if (eventType.includes('failed') || eventType.includes('denied') || eventType.includes('breach')) {
    return 'critical'
  } else if (eventType.includes('delete') || eventType.includes('export')) {
    return 'warning'
  } else {
    return 'info'
  }
}

function calculateChanges(beforeState, afterState) {
  if (!beforeState || !afterState) return null

  const changes = {}
  for (const key in afterState) {
    if (beforeState[key] !== afterState[key]) {
      changes[key] = {
        before: beforeState[key],
        after: afterState[key]
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

function generateRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function convertToCSV(data) {
  if (!data || data.length === 0) return ''

  const headers = ['id', 'event_type', 'event_category', 'severity', 'user_id', 'resource_type', 'resource_id', 'action', 'success', 'created_at']
  const rows = data.map(event => [
    event.id,
    event.event_type,
    event.event_category,
    event.severity,
    event.user_id,
    event.resource_type,
    event.resource_id,
    event.action,
    event.success,
    event.created_at
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
  ].join('\n')

  return csvContent
}

