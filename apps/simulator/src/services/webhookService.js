/**
 * Webhook Service
 * Handles webhook configuration, event triggers, and delivery tracking
 */

import { supabase } from './supabaseClient'

/**
 * Get all available webhook events
 */
export async function getWebhookEvents() {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('is_active', true)
      .order('event_name')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching webhook events:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Create a new webhook
 */
export async function createWebhook(webhookData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate a random secret key for webhook signature
    const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        webhook_name: webhookData.webhook_name,
        webhook_url: webhookData.webhook_url,
        project_id: webhookData.project_id || null,
        user_id: user.id,
        events: webhookData.events || [],
        secret_key: secretKey, // Should be encrypted in production
        content_type: webhookData.content_type || 'application/json',
        custom_headers: webhookData.custom_headers || {},
        timeout_seconds: webhookData.timeout_seconds || 30,
        max_retries: webhookData.max_retries || 3,
        retry_interval_seconds: webhookData.retry_interval_seconds || 60,
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
        secret_key: secretKey // Return secret only on creation
      },
      message: 'Webhook created successfully. Save the secret key for signature verification.'
    }
  } catch (error) {
    console.error('Error creating webhook:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get all webhooks for the current user or project
 */
export async function getWebhooks(filters = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('webhooks')
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

    // Mask secret keys in the list
    const maskedData = data.map(webhook => ({
      ...webhook,
      secret_key: webhook.secret_key ? '***********' : null
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Update a webhook
 */
export async function updateWebhook(webhookId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('webhooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Webhook updated successfully' }
  } catch (error) {
    console.error('Error updating webhook:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Delete a webhook (soft delete)
 */
export async function deleteWebhook(webhookId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('webhooks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Webhook deleted successfully' }
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Test a webhook by sending a test payload
 */
export async function testWebhook(webhookId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get webhook details
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) throw fetchError

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Project Nidus',
        webhook_id: webhookId
      }
    }

    // Send webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': webhook.content_type,
        'X-Nidus-Signature': generateWebhookSignature(testPayload, webhook.secret_key),
        ...webhook.custom_headers
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
    })

    // Log the test
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      event_type: 'webhook.test',
      payload: testPayload,
      delivery_status: response.ok ? 'delivered' : 'failed',
      status_code: response.status,
      response_body: await response.text(),
      delivered_at: response.ok ? new Date().toISOString() : null,
      error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
    })

    return {
      success: response.ok,
      message: response.ok
        ? 'Test webhook delivered successfully'
        : `Test webhook failed: HTTP ${response.status}`,
      data: {
        status_code: response.status,
        status_text: response.statusText
      }
    }
  } catch (error) {
    console.error('Error testing webhook:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateWebhookSignature(payload, secretKey) {
  // In production, use proper HMAC-SHA256 implementation
  // This is a simplified version
  const payloadString = JSON.stringify(payload)
  return `sha256=${btoa(secretKey + payloadString).substring(0, 64)}`
}

/**
 * Trigger a webhook event
 * This would typically be called from other parts of the application when events occur
 */
export async function triggerWebhookEvent(eventType, eventData, projectId = null) {
  try {
    // Get all active webhooks subscribed to this event
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .contains('events', [eventType])

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: webhooks, error } = await query

    if (error) throw error

    // Queue webhook deliveries
    const deliveryPromises = webhooks.map(webhook => queueWebhookDelivery(webhook, eventType, eventData))
    await Promise.all(deliveryPromises)

    return {
      success: true,
      message: `Queued ${webhooks.length} webhook(s) for event: ${eventType}`
    }
  } catch (error) {
    console.error('Error triggering webhook event:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Queue a webhook delivery
 */
async function queueWebhookDelivery(webhook, eventType, eventData) {
  try {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    }

    // Create log entry with pending status
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: payload,
        delivery_status: 'pending',
        attempt_count: 0,
        next_retry_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) throw logError

    // Attempt immediate delivery
    await attemptWebhookDelivery(webhook, logEntry.id, payload)

    return { success: true }
  } catch (error) {
    console.error('Error queuing webhook delivery:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Attempt webhook delivery with retry logic
 */
async function attemptWebhookDelivery(webhook, logId, payload, attemptNumber = 1) {
  try {
    const startTime = Date.now()

    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': webhook.content_type,
        'X-Nidus-Signature': generateWebhookSignature(payload, webhook.secret_key),
        'X-Nidus-Event': payload.event,
        'X-Nidus-Delivery-ID': logId,
        'X-Nidus-Attempt': attemptNumber.toString(),
        ...webhook.custom_headers
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
    })

    const responseTime = Date.now() - startTime
    const responseBody = await response.text()

    // Update log with delivery result
    await supabase
      .from('webhook_logs')
      .update({
        delivery_status: response.ok ? 'delivered' : 'failed',
        status_code: response.status,
        response_body: responseBody,
        response_time_ms: responseTime,
        attempt_count: attemptNumber,
        delivered_at: response.ok ? new Date().toISOString() : null,
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        next_retry_at: response.ok ? null : calculateNextRetry(attemptNumber, webhook.retry_interval_seconds)
      })
      .eq('id', logId)

    // Schedule retry if delivery failed and retries remain
    if (!response.ok && attemptNumber < webhook.max_retries) {
      // In production, this would be handled by a background job queue
      console.log(`Webhook delivery failed. Will retry (attempt ${attemptNumber + 1}/${webhook.max_retries})`)
    }

    return { success: response.ok }
  } catch (error) {
    console.error('Error attempting webhook delivery:', error)

    // Update log with error
    await supabase
      .from('webhook_logs')
      .update({
        delivery_status: 'failed',
        error_message: error.message,
        attempt_count: attemptNumber,
        next_retry_at: attemptNumber < webhook.max_retries
          ? calculateNextRetry(attemptNumber, webhook.retry_interval_seconds)
          : null
      })
      .eq('id', logId)

    return { success: false, message: error.message }
  }
}

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetry(attemptNumber, baseIntervalSeconds) {
  const backoffMultiplier = Math.pow(2, attemptNumber - 1)
  const retrySeconds = baseIntervalSeconds * backoffMultiplier
  const nextRetry = new Date()
  nextRetry.setSeconds(nextRetry.getSeconds() + retrySeconds)
  return nextRetry.toISOString()
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(webhookId = null, filters = {}) {
  try {
    let query = supabase
      .from('webhook_logs')
      .select('*')
    
    if (webhookId) {
      query = query.eq('webhook_id', webhookId)
    } else {
      // Get all logs for user's webhooks if no webhookId specified
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userWebhooks } = await supabase
          .from('webhooks')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
        
        if (userWebhooks && userWebhooks.length > 0) {
          query = query.in('webhook_id', userWebhooks.map(w => w.id))
        } else {
          return { success: true, data: [] }
        }
      } else {
        return { success: true, data: [] }
      }
    }

    if (filters.delivery_status) {
      query = query.eq('delivery_status', filters.delivery_status)
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

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching webhook logs:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId, timeframe = '7d') {
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
      .from('webhook_logs')
      .select('delivery_status, response_time_ms, created_at')
      .eq('webhook_id', webhookId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Calculate statistics
    const totalDeliveries = data.length
    const successfulDeliveries = data.filter(log => log.delivery_status === 'delivered').length
    const failedDeliveries = data.filter(log => log.delivery_status === 'failed').length
    const avgResponseTime = data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalDeliveries || 0

    return {
      success: true,
      data: {
        total_deliveries: totalDeliveries,
        successful_deliveries: successfulDeliveries,
        failed_deliveries: failedDeliveries,
        success_rate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries * 100).toFixed(2) : 0,
        avg_response_time_ms: Math.round(avgResponseTime),
        timeframe
      }
    }
  } catch (error) {
    console.error('Error fetching webhook stats:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(webhookId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const { data, error } = await supabase
      .from('webhooks')
      .update({
        secret_key: newSecret, // Should be encrypted in production
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        ...data,
        secret_key: newSecret
      },
      message: 'Webhook secret regenerated successfully. Update your webhook endpoint with the new secret.'
    }
  } catch (error) {
    console.error('Error regenerating webhook secret:', error)
    return { success: false, message: error.message }
  }
}
