/**
 * Integration Service
 * Handles integration operations and sync logic
 */

import { supabase } from './supabaseClient'

/**
 * Test integration connection
 */
export async function testIntegrationConnection(integrationId) {
  try {
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (fetchError) throw fetchError

    // Parse connection_config if it's a string
    const connectionConfig = typeof integration.connection_config === 'string'
      ? JSON.parse(integration.connection_config)
      : integration.connection_config

    // Call appropriate test function based on integration type
    switch (integration.integration_type) {
      case 'jira':
        return await testJiraConnection(connectionConfig)
      case 'github':
      case 'gitlab':
        return await testGitConnection(connectionConfig, integration.integration_type)
      case 'ms_project':
        return await testMSProjectConnection(connectionConfig)
      default:
        return { success: false, message: 'Integration type not supported' }
    }
  } catch (error) {
    console.error('Error testing connection:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Test Jira connection
 */
async function testJiraConnection(config) {
  try {
    const { url, username, api_token } = config
    
    if (!url || !username || !api_token) {
      return { success: false, message: 'Missing required connection parameters' }
    }

    // In a real implementation, this would make an API call to Jira
    // For now, we'll simulate the test
    const response = await fetch(`${url}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${api_token}`)}`,
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const user = await response.json()
      return {
        success: true,
        message: `Connected as ${user.displayName || user.emailAddress}`,
        data: user
      }
    } else {
      return {
        success: false,
        message: `Connection failed: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error.message}`
    }
  }
}

/**
 * Test GitHub/GitLab connection
 */
async function testGitConnection(config, type) {
  try {
    const { repository_url, token } = config
    
    if (!repository_url || !token) {
      return { success: false, message: 'Missing required connection parameters' }
    }

    // Parse repository URL
    const urlParts = repository_url.replace(/^https?:\/\//, '').split('/')
    const owner = urlParts[1]
    const repo = urlParts[2]?.replace(/\.git$/, '')

    if (!owner || !repo) {
      return { success: false, message: 'Invalid repository URL format' }
    }

    // Test connection based on type
    const apiUrl = type === 'github'
      ? `https://api.github.com/repos/${owner}/${repo}`
      : `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const repoData = await response.json()
      return {
        success: true,
        message: `Connected to ${repoData.name || repoData.path_with_namespace}`,
        data: repoData
      }
    } else {
      return {
        success: false,
        message: `Connection failed: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error.message}`
    }
  }
}

/**
 * Test MS Project connection
 */
async function testMSProjectConnection(config) {
  try {
    const { file_path } = config
    
    if (!file_path) {
      return { success: false, message: 'Missing file path' }
    }

    // In a real implementation, this would attempt to read/parse the MS Project file
    // For now, we'll just validate the path format
    if (file_path.startsWith('http://') || file_path.startsWith('https://')) {
      // Test URL accessibility
      const response = await fetch(file_path, { method: 'HEAD' })
      return {
        success: response.ok,
        message: response.ok ? 'File accessible' : 'File not accessible'
      }
    } else {
      // Local file - can't test from browser, assume valid
      return {
        success: true,
        message: 'Local file path configured (will be processed server-side)'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error.message}`
    }
  }
}

/**
 * Trigger integration sync
 */
export async function triggerSync(integrationId, syncType = 'manual') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('integration_sync_log')
      .insert({
        integration_id: integrationId,
        sync_type: syncType,
        sync_direction: 'bidirectional',
        sync_status: 'running',
        created_by: user.id,
      })
      .select()
      .single()

    if (logError) throw logError

    // In a real implementation, this would trigger a background job
    // For now, we'll return the sync log ID
    return {
      success: true,
      syncLogId: syncLog.id,
      message: 'Sync started'
    }
  } catch (error) {
    console.error('Error triggering sync:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * Get sync history for an integration
 */
export async function getSyncHistory(integrationId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('integration_sync_log')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('is_deleted', false)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get external item mappings
 */
export async function getItemMappings(integrationId, filters = {}) {
  try {
    let query = supabase
      .from('external_item_mappings')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('is_deleted', false)

    if (filters.mapping_status) {
      query = query.eq('mapping_status', filters.mapping_status)
    }
    if (filters.external_item_type) {
      query = query.eq('external_item_type', filters.external_item_type)
    }
    if (filters.internal_item_type) {
      query = query.eq('internal_item_type', filters.internal_item_type)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching mappings:', error)
    return { success: false, message: error.message, data: [] }
  }
}

