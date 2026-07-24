/**
 * Jira Integration Utilities
 * Handles Jira API interactions and data synchronization
 */

/**
 * Fetch issues from Jira
 */
export async function fetchJiraIssues(config, filters = {}) {
  try {
    const { url, username, api_token } = config
    
    if (!url || !username || !api_token) {
      throw new Error('Missing Jira connection configuration')
    }

    // Build JQL query
    let jql = filters.jql || 'ORDER BY created DESC'
    if (filters.project) {
      jql = `project = ${filters.project} AND ${jql}`
    }
    if (filters.status) {
      jql = `status = "${filters.status}" AND ${jql}`
    }

    const response = await fetch(
      `${url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${filters.maxResults || 50}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${api_token}`)}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      issues: data.issues || [],
      total: data.total || 0,
    }
  } catch (error) {
    console.error('Error fetching Jira issues:', error)
    return {
      success: false,
      message: error.message,
      issues: [],
    }
  }
}

/**
 * Create issue in Jira
 */
export async function createJiraIssue(config, issueData) {
  try {
    const { url, username, api_token } = config
    
    const response = await fetch(`${url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${api_token}`)}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: issueData.projectKey },
          summary: issueData.summary,
          description: issueData.description,
          issuetype: { name: issueData.issueType || 'Task' },
          priority: issueData.priority ? { name: issueData.priority } : undefined,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errorMessages?.join(', ') || 'Failed to create issue')
    }

    const data = await response.json()
    return {
      success: true,
      issue: data,
      issueKey: data.key,
    }
  } catch (error) {
    console.error('Error creating Jira issue:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

/**
 * Update issue in Jira
 */
export async function updateJiraIssue(config, issueKey, updates) {
  try {
    const { url, username, api_token } = config
    
    const fields = {}
    if (updates.summary) fields.summary = updates.summary
    if (updates.description) fields.description = updates.description
    if (updates.status) fields.status = { name: updates.status }
    if (updates.priority) fields.priority = { name: updates.priority }

    const response = await fetch(`${url}/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${api_token}`)}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.errorMessages?.join(', ') || 'Failed to update issue')
    }

    return {
      success: true,
      message: 'Issue updated successfully',
    }
  } catch (error) {
    console.error('Error updating Jira issue:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

/**
 * Map Jira issue to internal task format
 */
export function mapJiraIssueToTask(jiraIssue, projectId) {
  const fields = jiraIssue.fields || {}
  
  return {
    project_id: projectId,
    task_name: fields.summary || jiraIssue.key,
    task_description: fields.description || '',
    task_status: mapJiraStatusToInternal(fields.status?.name),
    priority: mapJiraPriorityToInternal(fields.priority?.name),
    due_date: fields.duedate || null,
    external_id: jiraIssue.key,
    external_url: jiraIssue.self?.replace('/rest/api/3/issue/', '/browse/'),
  }
}

/**
 * Map internal task to Jira issue format
 */
export function mapTaskToJiraIssue(task, projectKey) {
  return {
    project: { key: projectKey },
    summary: task.task_name,
    description: task.task_description || '',
    issuetype: { name: 'Task' },
    priority: task.priority ? { name: mapInternalPriorityToJira(task.priority) } : undefined,
  }
}

/**
 * Map Jira status to internal status
 */
function mapJiraStatusToInternal(jiraStatus) {
  const statusMap = {
    'To Do': 'not_started',
    'In Progress': 'in_progress',
    'Done': 'completed',
    'Closed': 'completed',
  }
  return statusMap[jiraStatus] || 'not_started'
}

/**
 * Map internal status to Jira status
 */
export function mapInternalStatusToJira(internalStatus) {
  const statusMap = {
    'not_started': 'To Do',
    'in_progress': 'In Progress',
    'completed': 'Done',
  }
  return statusMap[internalStatus] || 'To Do'
}

/**
 * Map Jira priority to internal priority
 */
function mapJiraPriorityToInternal(jiraPriority) {
  const priorityMap = {
    'Highest': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    'Lowest': 'low',
  }
  return priorityMap[jiraPriority] || 'medium'
}

/**
 * Map internal priority to Jira priority
 */
function mapInternalPriorityToJira(internalPriority) {
  const priorityMap = {
    'critical': 'Highest',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
  }
  return priorityMap[internalPriority] || 'Medium'
}

/**
 * Fetch Jira projects
 */
export async function fetchJiraProjects(config) {
  try {
    const { url, username, api_token } = config
    
    const response = await fetch(`${url}/rest/api/3/project`, {
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${api_token}`)}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`)
    }

    const projects = await response.json()
    return {
      success: true,
      projects: projects || [],
    }
  } catch (error) {
    console.error('Error fetching Jira projects:', error)
    return {
      success: false,
      message: error.message,
      projects: [],
    }
  }
}

