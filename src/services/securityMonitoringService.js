/**
 * Security Monitoring Service
 * Handles security events, alerts, threat intelligence, and incident tracking
 */

import { supabase } from './supabaseClient'

/**
 * Get security dashboard statistics
 */
export async function getSecurityDashboardStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get counts for various security metrics
    const [eventsResult, alertsResult, incidentsResult, failedLoginsResult] = await Promise.all([
      supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'new'),
      supabase.from('security_incidents').select('id', { count: 'exact', head: true }).eq('is_deleted', false).neq('status', 'closed'),
      supabase.from('audit_events').select('id', { count: 'exact', head: true }).eq('event_type', 'user.login.failed').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    return {
      success: true,
      data: {
        total_events: eventsResult.count || 0,
        active_alerts: alertsResult.count || 0,
        active_incidents: incidentsResult.count || 0,
        failed_logins_24h: failedLoginsResult.count || 0
      }
    }
  } catch (error) {
    console.error('Error fetching security dashboard stats:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get failed login attempts
 */
export async function getFailedLoginAttempts(timeRange = '24h') {
  try {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('event_type', 'user.login.failed')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching failed login attempts:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get unauthorized access attempts
 */
export async function getUnauthorizedAccessAttempts(timeRange = '24h') {
  try {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('event_type', 'user.unauthorized_access_attempt')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching unauthorized access attempts:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get suspicious activities
 */
export async function getSuspiciousActivities(timeRange = '24h') {
  try {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'suspicious_activity')
      .gte('created_at', startDate)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching suspicious activities:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Detect anomalous activity
 */
export async function detectAnomalousActivity(userId, activity) {
  try {
    // Simple anomaly detection - in production, use ML-based detection
    const riskScore = calculateRiskScore(activity)

    if (riskScore >= 70) {
      // Create security event
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('security_events')
        .insert({
          event_type: 'suspicious_activity',
          severity: riskScore >= 90 ? 'critical' : riskScore >= 80 ? 'high' : 'medium',
          user_id: userId,
          event_details: activity,
          risk_score: riskScore,
          is_resolved: false,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error

      // Create security alert if high risk
      if (riskScore >= 80) {
        await createSecurityAlert('anomalous_activity', riskScore >= 90 ? 'critical' : 'high', {
          user_id: userId,
          activity,
          risk_score: riskScore
        })
      }

      return { success: true, data, risk_score: riskScore, alert_created: riskScore >= 80 }
    }

    return { success: true, risk_score: riskScore, alert_created: false }
  } catch (error) {
    console.error('Error detecting anomalous activity:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Calculate risk score
 */
function calculateRiskScore(activity) {
  let score = 0

  // Example scoring logic - customize based on requirements
  if (activity.multiple_failed_logins) score += 30
  if (activity.unusual_location) score += 25
  if (activity.unusual_time) score += 15
  if (activity.rapid_requests) score += 20
  if (activity.unusual_resource_access) score += 25

  return Math.min(100, score)
}

/**
 * Create security alert
 */
export async function createSecurityAlert(alertType, severity, details) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('security_alerts')
      .insert({
        alert_type: alertType,
        severity,
        title: getAlertTitle(alertType),
        description: getAlertDescription(alertType, details),
        affected_users: details.user_id ? [details.user_id] : [],
        affected_resources: details.resources || {},
        status: 'new',
        detection_time: new Date().toISOString(),
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating security alert:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Assign security alert
 */
export async function assignSecurityAlert(alertId, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('security_alerts')
      .update({
        assigned_to: userId,
        acknowledgment_time: new Date().toISOString(),
        status: 'investigating',
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Alert assigned successfully' }
  } catch (error) {
    console.error('Error assigning security alert:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Resolve security alert
 */
export async function resolveSecurityAlert(alertId, resolutionNotes) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('security_alerts')
      .update({
        status: 'resolved',
        resolution_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Alert resolved successfully' }
  } catch (error) {
    console.error('Error resolving security alert:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Block IP address
 */
export async function blockIPAddress(ipAddress, reason) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Add to threat intelligence
    const { data, error } = await supabase
      .from('threat_intelligence')
      .insert({
        threat_type: 'blocked_ip',
        ip_address: ipAddress,
        threat_level: 'high',
        description: reason,
        source: 'manual',
        is_blocked: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'IP address blocked' }
  } catch (error) {
    console.error('Error blocking IP address:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Create security incident
 */
export async function createSecurityIncident(incidentData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate incident number
    const incidentNumber = `INC-${Date.now()}`

    const { data, error } = await supabase
      .from('security_incidents')
      .insert({
        incident_number: incidentNumber,
        incident_type: incidentData.incident_type,
        severity: incidentData.severity || 'medium',
        title: incidentData.title,
        description: incidentData.description,
        status: 'detected',
        detected_at: new Date().toISOString(),
        reported_by: user.id,
        assigned_to: incidentData.assigned_to || null,
        impact_assessment: incidentData.impact_assessment,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Security incident created' }
  } catch (error) {
    console.error('Error creating security incident:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Update security incident
 */
export async function updateSecurityIncident(incidentId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('security_incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', incidentId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Security incident updated' }
  } catch (error) {
    console.error('Error updating security incident:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get security alerts
 */
export async function getSecurityAlerts(filters = {}) {
  try {
    let query = supabase
      .from('security_alerts')
      .select('*')
      .eq('is_deleted', false)
      .order('detection_time', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching security alerts:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Helper functions
 */
function getAlertTitle(alertType) {
  const titles = {
    anomalous_activity: 'Anomalous Activity Detected',
    failed_login: 'Multiple Failed Login Attempts',
    unauthorized_access: 'Unauthorized Access Attempt',
    data_breach: 'Potential Data Breach',
    suspicious_activity: 'Suspicious Activity Detected'
  }
  return titles[alertType] || 'Security Alert'
}

function getAlertDescription(alertType, details) {
  const descriptions = {
    anomalous_activity: `Anomalous activity detected with risk score ${details.risk_score}`,
    failed_login: 'Multiple failed login attempts detected',
    unauthorized_access: 'Unauthorized access attempt detected',
    data_breach: 'Potential data breach detected',
    suspicious_activity: 'Suspicious activity detected'
  }
  return descriptions[alertType] || 'Security alert triggered'
}

