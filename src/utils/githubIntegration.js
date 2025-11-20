/**
 * GitHub/GitLab Integration Utilities
 * Handles repository interactions and commit tracking
 */

import { supabase } from '../services/supabaseClient'

/**
 * Fetch commits from repository
 */
export async function fetchCommits(config, filters = {}) {
  try {
    const { repository_url, token, branch } = config
    
    if (!repository_url || !token) {
      throw new Error('Missing repository connection configuration')
    }

    // Parse repository URL
    const urlParts = repository_url.replace(/^https?:\/\//, '').split('/')
    const owner = urlParts[1]
    const repo = urlParts[2]?.replace(/\.git$/, '')

    if (!owner || !repo) {
      throw new Error('Invalid repository URL format')
    }

    // Determine if GitHub or GitLab
    const isGitHub = repository_url.includes('github.com')
    const apiUrl = isGitHub
      ? `https://api.github.com/repos/${owner}/${repo}/commits`
      : `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/commits`

    const params = new URLSearchParams()
    if (branch) params.append('sha', branch)
    if (filters.since) params.append('since', filters.since)
    if (filters.until) params.append('until', filters.until)
    if (filters.per_page) params.append('per_page', filters.per_page)
    if (!isGitLab) params.append('per_page', filters.per_page || 30)

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const commits = await response.json()
    return {
      success: true,
      commits: commits || [],
    }
  } catch (error) {
    console.error('Error fetching commits:', error)
    return {
      success: false,
      message: error.message,
      commits: [],
    }
  }
}

/**
 * Fetch pull requests from repository
 */
export async function fetchPullRequests(config, filters = {}) {
  try {
    const { repository_url, token } = config
    
    // Parse repository URL
    const urlParts = repository_url.replace(/^https?:\/\//, '').split('/')
    const owner = urlParts[1]
    const repo = urlParts[2]?.replace(/\.git$/, '')

    const isGitHub = repository_url.includes('github.com')
    
    if (isGitHub) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`
      const params = new URLSearchParams()
      if (filters.state) params.append('state', filters.state)
      if (filters.per_page) params.append('per_page', filters.per_page)

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`)
      }

      const prs = await response.json()
      return {
        success: true,
        pullRequests: prs || [],
      }
    } else {
      // GitLab merge requests
      const apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}/merge_requests`
      const params = new URLSearchParams()
      if (filters.state) params.append('state', filters.state)

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`GitLab API error: ${response.statusText}`)
      }

      const mrs = await response.json()
      return {
        success: true,
        pullRequests: mrs || [],
      }
    }
  } catch (error) {
    console.error('Error fetching pull requests:', error)
    return {
      success: false,
      message: error.message,
      pullRequests: [],
    }
  }
}

/**
 * Link commit to task
 */
export async function linkCommitToTask(commitSha, taskId, integrationId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create external item mapping
    const { error } = await supabase
      .from('external_item_mappings')
      .insert({
        integration_id: integrationId,
        external_system: 'github',
        external_item_type: 'commit',
        external_item_id: commitSha,
        internal_item_type: 'task',
        internal_item_id: taskId,
        mapping_status: 'active',
        created_by: user.id,
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error linking commit:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Map commit to activity log entry
 */
export function mapCommitToActivity(commit, projectId) {
  return {
    project_id: projectId,
    activity_type: 'commit',
    activity_description: commit.commit?.message || commit.message,
    activity_date: commit.commit?.author?.date || commit.committed_date,
    external_id: commit.sha || commit.id,
    external_url: commit.html_url || commit.web_url,
    user_name: commit.commit?.author?.name || commit.author_name,
  }
}

