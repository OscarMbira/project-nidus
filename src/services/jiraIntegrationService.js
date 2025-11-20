/**
 * Jira Integration Service
 * Handles bidirectional synchronization with Jira
 */

import { supabase } from './supabaseClient'

/**
 * Create a new Jira connection
 */
export async function createJiraConnection(connectionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Test connection first
    const testResult = await testJiraConnection({
      jira_url: connectionData.jira_url,
      jira_email: connectionData.jira_email,
      api_token: connectionData.api_token
    })

    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.message}`)
    }

    const { data, error } = await supabase
      .from('jira_connections')
      .insert({
        project_id: connectionData.project_id,
        user_id: user.id,
        connection_name: connectionData.connection_name,
        jira_url: connectionData.jira_url,
        jira_project_key: connectionData.jira_project_key,
        jira_project_id: testResult.data?.projectId || null,
        jira_email: connectionData.jira_email,
        api_token: connectionData.api_token, // Should be encrypted in production
        sync_direction: connectionData.sync_direction || 'bidirectional',
        sync_frequency: connectionData.sync_frequency || 'manual',
        auto_sync: connectionData.auto_sync || false,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Create default field mappings
    await createDefaultFieldMappings(data.id, user.id)

    return {
      success: true,
      data,
      message: 'Jira connection created successfully'
    }
  } catch (error) {
    console.error('Error creating Jira connection:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Test Jira connection
 */
export async function testJiraConnection(credentials) {
  try {
    const { jira_url, jira_email, api_token } = credentials

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(`${jira_email}:${api_token}`)}`

    // Test connection by fetching current user
    const userResponse = await fetch(`${jira_url}/rest/api/3/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    })

    if (!userResponse.ok) {
      throw new Error(`Authentication failed: ${userResponse.statusText}`)
    }

    const userData = await userResponse.json()

    return {
      success: true,
      message: `Connected as ${userData.displayName || userData.emailAddress}`,
      data: {
        user: userData,
        url: jira_url
      }
    }
  } catch (error) {
    console.error('Error testing Jira connection:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Create default field mappings
 */
async function createDefaultFieldMappings(connectionId, userId) {
  const defaultMappings = [
    { jira: 'summary', nidus: 'task_name', type: 'string' },
    { jira: 'description', nidus: 'description', type: 'string' },
    { jira: 'status', nidus: 'status', type: 'string' },
    { jira: 'priority', nidus: 'priority', type: 'string' },
    { jira: 'assignee', nidus: 'assigned_to_id', type: 'user' },
    { jira: 'reporter', nidus: 'created_by', type: 'user' },
    { jira: 'duedate', nidus: 'planned_end_date', type: 'date' },
    { jira: 'created', nidus: 'created_at', type: 'date' },
    { jira: 'updated', nidus: 'updated_at', type: 'date' }
  ]

  for (const mapping of defaultMappings) {
    await supabase
      .from('jira_field_mappings')
      .insert({
        jira_connection_id: connectionId,
        jira_field: mapping.jira,
        jira_field_type: mapping.type,
        nidus_field: mapping.nidus,
        nidus_table: 'tasks',
        mapping_direction: 'bidirectional',
        is_active: true,
        created_by: userId
      })
  }
}

/**
 * Get all Jira connections
 */
export async function getJiraConnections(projectId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('jira_connections')
      .select(`
        *,
        projects(project_name)
      `)
      .eq('is_deleted', false)

    if (projectId) {
      query = query.eq('project_id', projectId)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Mask API tokens
    const maskedData = data.map(conn => ({
      ...conn,
      api_token: '***********'
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching Jira connections:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Trigger a manual sync
 */
export async function triggerSync(connectionId, syncOptions = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('jira_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_deleted', false)
      .single()

    if (connError) throw connError

    if (!connection.is_active) {
      throw new Error('Connection is not active')
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('jira_sync_logs')
      .insert({
        jira_connection_id: connectionId,
        sync_direction: syncOptions.direction || connection.sync_direction,
        sync_type: 'manual',
        sync_status: 'in_progress',
        sync_started_at: new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (logError) throw logError

    try {
      // Perform the sync
      const syncResult = await performSync(connection, syncLog.id, syncOptions)

      // Update sync log with results
      const syncDuration = Date.now() - new Date(syncLog.sync_started_at).getTime()

      await supabase
        .from('jira_sync_logs')
        .update({
          sync_status: syncResult.success ? 'success' : 'failed',
          items_synced: syncResult.synced || 0,
          items_failed: syncResult.failed || 0,
          items_skipped: syncResult.skipped || 0,
          sync_details: syncResult.details,
          error_log: syncResult.error || null,
          sync_completed_at: new Date().toISOString(),
          sync_duration_ms: syncDuration
        })
        .eq('id', syncLog.id)

      // Update connection last sync time
      if (syncResult.success) {
        await supabase
          .from('jira_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connectionId)
      }

      return {
        success: syncResult.success,
        data: {
          sync_log_id: syncLog.id,
          items_synced: syncResult.synced || 0,
          items_failed: syncResult.failed || 0
        },
        message: syncResult.success
          ? `Sync completed: ${syncResult.synced} items synced`
          : `Sync failed: ${syncResult.error}`
      }
    } catch (syncError) {
      // Update sync log with failure
      await supabase
        .from('jira_sync_logs')
        .update({
          sync_status: 'failed',
          error_log: syncError.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)

      throw syncError
    }
  } catch (error) {
    console.error('Error triggering sync:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Perform synchronization
 */
async function performSync(connection, syncLogId, options) {
  const results = {
    success: false,
    synced: 0,
    failed: 0,
    skipped: 0,
    details: {},
    error: null
  }

  try {
    // Get field mappings
    const { data: mappings } = await supabase
      .from('jira_field_mappings')
      .select('*')
      .eq('jira_connection_id', connection.id)
      .eq('is_active', true)

    const direction = options.direction || connection.sync_direction

    if (direction === 'import' || direction === 'bidirectional') {
      // Import from Jira to Nidus
      const importResults = await importFromJira(connection, mappings)
      results.synced += importResults.synced
      results.failed += importResults.failed
      results.details.import = importResults
    }

    if (direction === 'export' || direction === 'bidirectional') {
      // Export from Nidus to Jira
      const exportResults = await exportToJira(connection, mappings)
      results.synced += exportResults.synced
      results.failed += exportResults.failed
      results.details.export = exportResults
    }

    results.success = true
  } catch (error) {
    results.error = error.message
  }

  return results
}

/**
 * Import issues from Jira to Nidus
 */
async function importFromJira(connection, mappings) {
  const results = { synced: 0, failed: 0, items: [] }

  try {
    const authHeader = `Basic ${btoa(`${connection.jira_email}:${connection.api_token}`)}`

    // Fetch issues from Jira
    const jql = `project = ${connection.jira_project_key} ORDER BY created DESC`
    const response = await fetch(
      `${connection.jira_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Process each issue
    for (const jiraIssue of data.issues) {
      try {
        await importJiraIssue(connection, jiraIssue, mappings)
        results.synced++
        results.items.push({ key: jiraIssue.key, status: 'synced' })
      } catch (error) {
        results.failed++
        results.items.push({ key: jiraIssue.key, status: 'failed', error: error.message })
      }
    }
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`)
  }

  return results
}

/**
 * Import a single Jira issue
 */
async function importJiraIssue(connection, jiraIssue, mappings) {
  const { data: { user } } = await supabase.auth.getUser()

  // Check if issue already mapped
  const { data: existingMapping } = await supabase
    .from('jira_item_mappings')
    .select('*')
    .eq('jira_connection_id', connection.id)
    .eq('jira_issue_id', jiraIssue.id)
    .single()

  // Transform Jira issue to Nidus task
  const nidusTask = transformJiraToNidus(jiraIssue, mappings, connection.project_id)

  // Calculate checksum
  const jiraChecksum = calculateChecksum(jiraIssue)

  if (existingMapping) {
    // Update existing task
    const { error: updateError } = await supabase
      .from('tasks')
      .update(nidusTask)
      .eq('id', existingMapping.nidus_item_id)

    if (updateError) throw updateError

    // Update mapping
    await supabase
      .from('jira_item_mappings')
      .update({
        jira_checksum: jiraChecksum,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced'
      })
      .eq('id', existingMapping.id)
  } else {
    // Create new task
    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        ...nidusTask,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) throw createError

    // Create mapping
    await supabase
      .from('jira_item_mappings')
      .insert({
        jira_connection_id: connection.id,
        jira_issue_id: jiraIssue.id,
        jira_issue_key: jiraIssue.key,
        jira_issue_type: jiraIssue.fields.issuetype.name,
        nidus_item_type: 'task',
        nidus_item_id: newTask.id,
        jira_checksum: jiraChecksum,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        created_by: user.id
      })
  }
}

/**
 * Transform Jira issue to Nidus task
 */
function transformJiraToNidus(jiraIssue, mappings, projectId) {
  const task = {
    project_id: projectId,
    task_name: jiraIssue.fields.summary || 'Untitled',
    description: jiraIssue.fields.description || null,
    priority: mapJiraPriority(jiraIssue.fields.priority?.name),
    status: mapJiraStatus(jiraIssue.fields.status?.name),
    planned_end_date: jiraIssue.fields.duedate || null
  }

  // Apply custom mappings
  mappings.forEach(mapping => {
    if (mapping.mapping_direction === 'import' || mapping.mapping_direction === 'bidirectional') {
      const jiraValue = getNestedValue(jiraIssue.fields, mapping.jira_field)
      if (jiraValue !== undefined) {
        task[mapping.nidus_field] = transformValue(jiraValue, mapping.transformation_rule)
      }
    }
  })

  return task
}

/**
 * Export tasks from Nidus to Jira
 */
async function exportToJira(connection, mappings) {
  const results = { synced: 0, failed: 0, items: [] }

  try {
    // Get tasks that need to be synced
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', connection.project_id)
      .eq('is_deleted', false)

    if (tasksError) throw tasksError

    // Process each task
    for (const task of tasks) {
      try {
        await exportNidusTask(connection, task, mappings)
        results.synced++
        results.items.push({ task_id: task.id, status: 'synced' })
      } catch (error) {
        results.failed++
        results.items.push({ task_id: task.id, status: 'failed', error: error.message })
      }
    }
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`)
  }

  return results
}

/**
 * Export a single Nidus task to Jira
 */
async function exportNidusTask(connection, task, mappings) {
  const authHeader = `Basic ${btoa(`${connection.jira_email}:${connection.api_token}`)}`

  // Check if task already mapped
  const { data: existingMapping } = await supabase
    .from('jira_item_mappings')
    .select('*')
    .eq('jira_connection_id', connection.id)
    .eq('nidus_item_id', task.id)
    .single()

  // Transform Nidus task to Jira issue
  const jiraIssue = transformNidusToJira(task, mappings, connection.jira_project_key)

  if (existingMapping) {
    // Update existing Jira issue
    const response = await fetch(
      `${connection.jira_url}/rest/api/3/issue/${existingMapping.jira_issue_key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: jiraIssue })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update Jira issue: ${response.statusText}`)
    }

    // Update mapping
    await supabase
      .from('jira_item_mappings')
      .update({
        nidus_checksum: calculateChecksum(task),
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced'
      })
      .eq('id', existingMapping.id)
  } else {
    // Create new Jira issue
    const response = await fetch(
      `${connection.jira_url}/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: jiraIssue })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Failed to create Jira issue: ${errorData}`)
    }

    const newIssue = await response.json()

    // Create mapping
    await supabase
      .from('jira_item_mappings')
      .insert({
        jira_connection_id: connection.id,
        jira_issue_id: newIssue.id,
        jira_issue_key: newIssue.key,
        jira_issue_type: 'Task',
        nidus_item_type: 'task',
        nidus_item_id: task.id,
        nidus_checksum: calculateChecksum(task),
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced'
      })
  }
}

/**
 * Transform Nidus task to Jira issue format
 */
function transformNidusToJira(task, mappings, projectKey) {
  const jiraIssue = {
    project: { key: projectKey },
    summary: task.task_name,
    description: task.description || '',
    issuetype: { name: 'Task' }
  }

  if (task.priority) {
    jiraIssue.priority = { name: mapNidusPriorityToJira(task.priority) }
  }

  if (task.planned_end_date) {
    jiraIssue.duedate = task.planned_end_date.split('T')[0]
  }

  // Apply custom mappings
  mappings.forEach(mapping => {
    if (mapping.mapping_direction === 'export' || mapping.mapping_direction === 'bidirectional') {
      const nidusValue = task[mapping.nidus_field]
      if (nidusValue !== undefined && nidusValue !== null) {
        jiraIssue[mapping.jira_field] = transformValue(nidusValue, mapping.transformation_rule)
      }
    }
  })

  return jiraIssue
}

/**
 * Map Jira priority to Nidus priority
 */
function mapJiraPriority(jiraPriority) {
  const priorityMap = {
    'Highest': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    'Lowest': 'low'
  }
  return priorityMap[jiraPriority] || 'medium'
}

/**
 * Map Nidus priority to Jira priority
 */
function mapNidusPriorityToJira(nidusPriority) {
  const priorityMap = {
    'critical': 'Highest',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  }
  return priorityMap[nidusPriority] || 'Medium'
}

/**
 * Map Jira status to Nidus status
 */
function mapJiraStatus(jiraStatus) {
  const statusMap = {
    'To Do': 'not_started',
    'In Progress': 'in_progress',
    'Done': 'completed',
    'Closed': 'completed'
  }
  return statusMap[jiraStatus] || 'not_started'
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

/**
 * Transform value based on transformation rule
 */
function transformValue(value, rule) {
  if (!rule) return value

  try {
    if (typeof rule === 'object') {
      if (rule.type === 'date' && value) {
        return new Date(value).toISOString()
      } else if (rule.type === 'mapping' && rule.map) {
        return rule.map[value] || value
      }
    }
  } catch (error) {
    console.error('Error transforming value:', error)
  }

  return value
}

/**
 * Calculate MD5 checksum for change detection
 */
function calculateChecksum(data) {
  // Simple checksum implementation
  // In production, use a proper MD5 library
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

/**
 * Get sync history
 */
export async function getSyncHistory(connectionId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('jira_sync_logs')
      .select('*')
      .eq('jira_connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get item mappings
 */
export async function getItemMappings(connectionId, filters = {}) {
  try {
    let query = supabase
      .from('jira_item_mappings')
      .select('*')
      .eq('jira_connection_id', connectionId)

    if (filters.sync_status) {
      query = query.eq('sync_status', filters.sync_status)
    }

    const { data, error } = await query.order('last_synced_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching item mappings:', error)
    return { success: false, message: error.message, data: [] }
  }
}
