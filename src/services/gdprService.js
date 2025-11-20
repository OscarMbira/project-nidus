/**
 * GDPR Service
 * Handles GDPR compliance features: consent, data export, data deletion, privacy preferences, and data breach tracking
 */

import { supabase } from './supabaseClient'

/**
 * Record user consent
 */
export async function recordConsent(userId, consentType, consentGiven, consentText, consentVersion = '1.0') {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('consent_logs')
      .insert({
        user_id: userId,
        consent_type: consentType,
        consent_given: consentGiven,
        consent_text: consentText,
        consent_version: consentVersion,
        consent_method: 'explicit',
        ip_address: null, // Get from request in production
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Consent recorded successfully' }
  } catch (error) {
    console.error('Error recording consent:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get consent history for user
 */
export async function getConsentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('consent_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching consent history:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Request data export
 */
export async function requestDataExport(userId, format = 'json') {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        request_type: 'data_export',
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        export_format: format,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Data export request submitted' }
  } catch (error) {
    console.error('Error requesting data export:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Process data export request
 */
export async function processDataExportRequest(requestId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get request
    const { data: request, error: fetchError } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError

    if (request.request_status !== 'pending') {
      throw new Error('Request is not pending')
    }

    // Update status to processing
    await supabase
      .from('data_export_requests')
      .update({
        request_status: 'processing',
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', requestId)

    // Generate export file (simplified - implement full data collection)
    const exportData = await generateDataExportFile(request.user_id, request.export_format)

    // In production, save file to storage and update file_path
    const filePath = `/exports/${request.user_id}_${Date.now()}.${request.export_format}`

    // Update request with file path and complete
    const { data, error } = await supabase
      .from('data_export_requests')
      .update({
        request_status: 'completed',
        export_file_path: filePath,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      export_data: exportData,
      message: 'Data export completed'
    }
  } catch (error) {
    console.error('Error processing data export request:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Generate data export file
 */
async function generateDataExportFile(userId, format) {
  try {
    // Collect all user data (simplified - implement comprehensive data collection)
    const [userData, projects, tasks, preferences] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('user_projects').select('*, projects(*)').eq('user_id', userId).eq('is_deleted', false),
      supabase.from('tasks').select('*').eq('assigned_to', userId).eq('is_deleted', false),
      supabase.from('user_preferences').select('*').eq('user_id', userId).eq('is_deleted', false).single()
    ])

    const exportData = {
      user: userData.data,
      projects: projects.data,
      tasks: tasks.data,
      preferences: preferences.data,
      exported_at: new Date().toISOString()
    }

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2)
    } else if (format === 'csv') {
      // Convert to CSV format (simplified)
      return convertToCSV(exportData)
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }
  } catch (error) {
    console.error('Error generating data export file:', error)
    throw error
  }
}

/**
 * Request data deletion (right to be forgotten)
 */
export async function requestDataDeletion(userId, reason = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        request_status: 'pending',
        requested_at: new Date().toISOString(),
        scheduled_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days grace period
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Data deletion request submitted' }
  } catch (error) {
    console.error('Error requesting data deletion:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Process data deletion request
 */
export async function processDataDeletionRequest(requestId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get request
    const { data: request, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError

    if (request.request_status !== 'pending') {
      throw new Error('Request is not pending')
    }

    // Update status to processing
    await supabase
      .from('data_deletion_requests')
      .update({
        request_status: 'processing',
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', requestId)

    // Anonymize user data (simplified - implement comprehensive anonymization)
    const deletionScope = await anonymizeUserData(request.user_id)

    // Update request with deletion scope and complete
    const { data, error } = await supabase
      .from('data_deletion_requests')
      .update({
        request_status: 'completed',
        deletion_scope: deletionScope,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Data deletion completed' }
  } catch (error) {
    console.error('Error processing data deletion request:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Anonymize user data
 */
async function anonymizeUserData(userId) {
  try {
    const anonymizedId = `anonymized_${Date.now()}`
    const deletionScope = {
      user_id: userId,
      anonymized_id: anonymizedId,
      tables_affected: []
    }

    // Anonymize user record (soft delete and anonymize)
    await supabase
      .from('users')
      .update({
        email: `${anonymizedId}@deleted.local`,
        full_name: 'Deleted User',
        first_name: null,
        last_name: null,
        phone_number: null,
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId)

    deletionScope.tables_affected.push('users')

    // Add more tables as needed
    // Note: In production, implement comprehensive anonymization for all user data

    return deletionScope
  } catch (error) {
    console.error('Error anonymizing user data:', error)
    throw error
  }
}

/**
 * Update privacy preferences
 */
export async function updatePrivacyPreferences(userId, preferences) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('privacy_preferences')
      .upsert({
        user_id: userId,
        allow_marketing_emails: preferences.allow_marketing_emails !== undefined ? preferences.allow_marketing_emails : false,
        allow_analytics_tracking: preferences.allow_analytics_tracking !== undefined ? preferences.allow_analytics_tracking : false,
        allow_third_party_sharing: preferences.allow_third_party_sharing !== undefined ? preferences.allow_third_party_sharing : false,
        data_retention_preference: preferences.data_retention_preference || 'standard',
        communication_preferences: preferences.communication_preferences || {},
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Privacy preferences updated' }
  } catch (error) {
    console.error('Error updating privacy preferences:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get privacy preferences
 */
export async function getPrivacyPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error fetching privacy preferences:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Create data breach record
 */
export async function createDataBreachRecord(breachData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate breach number
    const breachNumber = `BR-${Date.now()}`

    const { data, error } = await supabase
      .from('data_breach_records')
      .insert({
        breach_number: breachNumber,
        breach_type: breachData.breach_type,
        severity: breachData.severity || 'medium',
        affected_users_count: breachData.affected_users?.length || 0,
        affected_users: breachData.affected_users || [],
        data_types_affected: breachData.data_types_affected || [],
        breach_detected_at: new Date().toISOString(),
        status: 'detected',
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Data breach record created' }
  } catch (error) {
    console.error('Error creating data breach record:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Helper functions
 */
function convertToCSV(data) {
  // Simplified CSV conversion - implement comprehensive CSV generation in production
  return JSON.stringify(data)
}

