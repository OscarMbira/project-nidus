/**
 * API Management Service
 * Handles API key management, scopes, rate limiting, and request logging
 */

import { supabase } from './supabaseClient'
// No external UUID dependency needed - using crypto.getRandomValues

/**
 * Generate a secure API key
 */
function generateApiKey() {
  const prefix = 'nidus_'
  const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix + randomString
}

/**
 * Generate a secure API secret
 */
function generateApiSecret() {
  const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return randomString
}

/**
 * Get all available API scopes
 */
export async function getApiScopes() {
  try {
    const { data, error } = await supabase
      .from('api_scopes')
      .select('*')
      .eq('is_active', true)
      .order('scope_name')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching API scopes:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Create a new API key
 */
export async function createApiKey(keyData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const apiKey = generateApiKey()
    const apiSecret = generateApiSecret()

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        key_name: keyData.key_name,
        api_key: apiKey,
        api_secret: apiSecret, // Should be encrypted in production
        project_id: keyData.project_id || null,
        user_id: user.id,
        scope: keyData.scope || [],
        rate_limit: keyData.rate_limit || 1000,
        expires_at: keyData.expires_at || null,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        ...data,
        api_key: apiKey, // Return unencrypted key only on creation
        api_secret: apiSecret
      },
      message: 'API key created successfully. Save the key and secret - they won\'t be shown again.'
    }
  } catch (error) {
    console.error('Error creating API key:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get all API keys for the current user or project
 */
export async function getApiKeys(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('api_keys')
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

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Mask API keys in the list
    const maskedData = data.map(key => ({
      ...key,
      api_key: key.api_key ? `${key.api_key.substring(0, 12)}...` : null,
      api_secret: '***********'
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Update an API key
 */
export async function updateApiKey(keyId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'API key updated successfully' }
  } catch (error) {
    console.error('Error updating API key:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(keyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'API key deactivated successfully' }
  } catch (error) {
    console.error('Error deactivating API key:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Delete an API key (soft delete)
 */
export async function deleteApiKey(keyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'API key deleted successfully' }
  } catch (error) {
    console.error('Error deleting API key:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get API logs for a specific key
 */
export async function getApiLogs(apiKeyId, filters = {}) {
  try {
    let query = supabase
      .from('api_logs')
      .select('*')
      .eq('api_key_id', apiKeyId)

    if (filters.status_code) {
      query = query.eq('status_code', filters.status_code)
    }

    if (filters.endpoint) {
      query = query.ilike('endpoint', `%${filters.endpoint}%`)
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching API logs:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(apiKeyId, timeframe = '7d') {
  try {
    // Calculate start date based on timeframe
    const now = new Date()
    let startDate = new Date()

    switch (timeframe) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    const { data, error } = await supabase
      .from('api_logs')
      .select('status_code, response_time_ms, created_at')
      .eq('api_key_id', apiKeyId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Calculate statistics
    const totalRequests = data.length
    const successfulRequests = data.filter(log => log.status_code >= 200 && log.status_code < 300).length
    const errorRequests = data.filter(log => log.status_code >= 400).length
    const avgResponseTime = data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests || 0

    return {
      success: true,
      data: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        error_requests: errorRequests,
        success_rate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
        avg_response_time_ms: Math.round(avgResponseTime),
        timeframe
      }
    }
  } catch (error) {
    console.error('Error fetching API usage stats:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Check rate limit for an API key
 */
export async function checkRateLimit(apiKeyId) {
  try {
    // Get the API key's rate limit
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('rate_limit')
      .eq('id', apiKeyId)
      .single()

    if (keyError) throw keyError

    // Check current usage in the last hour
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: rateLimitData, error: limitError } = await supabase
      .from('api_rate_limits')
      .select('request_count')
      .eq('api_key_id', apiKeyId)
      .gte('window_start', oneHourAgo.toISOString())
      .single()

    if (limitError && limitError.code !== 'PGRST116') throw limitError

    const currentCount = rateLimitData?.request_count || 0
    const limitExceeded = currentCount >= apiKey.rate_limit

    return {
      success: true,
      data: {
        limit: apiKey.rate_limit,
        current: currentCount,
        remaining: Math.max(0, apiKey.rate_limit - currentCount),
        limit_exceeded: limitExceeded
      }
    }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Regenerate API secret
 */
export async function regenerateApiSecret(keyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const newSecret = generateApiSecret()

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        api_secret: newSecret, // Should be encrypted in production
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        ...data,
        api_secret: newSecret
      },
      message: 'API secret regenerated successfully. Save the new secret - it won\'t be shown again.'
    }
  } catch (error) {
    console.error('Error regenerating API secret:', error)
    return { success: false, message: error.message }
  }
}
