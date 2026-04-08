/**
 * End Stage Report Issue Service
 * Manages issue review tracking
 */

import { supabase } from './supabaseClient'

/**
 * Add Issue Review
 * @param {string} reportId - Report ID
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue review
 */
export async function addIssueReview(reportId, issueData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_stage_report_id: reportId,
      issue_id: issueData.issue_id || null,
      issue_title: issueData.issue_title || 'Unnamed Issue',
      issue_description: issueData.issue_description || null,
      issue_status: issueData.issue_status || 'carried-forward',
      issue_impact: issueData.issue_impact || null,
      resolution_actions: issueData.resolution_actions || null,
      lessons_from_issue: issueData.lessons_from_issue || null,
      display_order: issueData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_stage_report_issue_review')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding issue review:', error)
    throw error
  }
}

/**
 * Update Issue Review
 * @param {string} issueReviewId - Issue review ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated issue review
 */
export async function updateIssueReview(issueReviewId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_stage_report_issue_review')
      .update(updates)
      .eq('id', issueReviewId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating issue review:', error)
    throw error
  }
}

/**
 * Delete Issue Review
 * @param {string} issueReviewId - Issue review ID
 * @returns {Promise<void>}
 */
export async function deleteIssueReview(issueReviewId) {
  try {
    const { error } = await supabase
      .from('end_stage_report_issue_review')
      .delete()
      .eq('id', issueReviewId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting issue review:', error)
    throw error
  }
}

/**
 * Get Issue Reviews
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Issue reviews
 */
export async function getIssueReviews(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_issue_review')
      .select('*')
      .eq('end_stage_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching issue reviews:', error)
    throw error
  }
}

/**
 * Sync Issues from Register
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Synced issues
 */
export async function syncIssuesFromRegister(reportId) {
  try {
    // Get report to find project
    const { data: report } = await supabase
      .from('end_stage_reports')
      .select('project_id')
      .eq('id', reportId)
      .single()

    if (!report) throw new Error('Report not found')

    // Get open/resolved issues for the project
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('project_id', report.project_id)
      .eq('is_deleted', false)
      .in('status', ['open', 'resolved', 'in-progress'])

    if (issuesError && issuesError.code !== 'PGRST116') {
      throw issuesError
    }

    const syncedIssues = []
    for (const issue of issues || []) {
      try {
        // Check if issue review already exists
        const { data: existing } = await supabase
          .from('end_stage_report_issue_review')
          .select('id')
          .eq('end_stage_report_id', reportId)
          .eq('issue_id', issue.id)
          .single()

        if (!existing) {
          const review = await addIssueReview(reportId, {
            issue_id: issue.id,
            issue_title: issue.issue_title || issue.title,
            issue_description: issue.issue_description || issue.description,
            issue_status: issue.status === 'resolved' ? 'resolved' : 'carried-forward',
            issue_impact: issue.impact || issue.description
          })
          syncedIssues.push(review)
        }
      } catch (err) {
        console.error(`Error syncing issue ${issue.id}:`, err)
      }
    }

    return syncedIssues
  } catch (error) {
    console.error('Error syncing issues from register:', error)
    throw error
  }
}

/**
 * Update Issue Statuses
 * @param {string} reportId - Report ID
 * @param {Array<Object>} statusUpdates - Array of {issueReviewId, issue_status} objects
 * @returns {Promise<Array>} Updated issue reviews
 */
export async function updateIssueStatuses(reportId, statusUpdates) {
  try {
    const updatedIssues = []
    
    for (const update of statusUpdates) {
      try {
        const updated = await updateIssueReview(update.issueReviewId, {
          issue_status: update.issue_status,
          resolution_actions: update.resolution_actions
        })
        updatedIssues.push(updated)
      } catch (err) {
        console.error(`Error updating issue review ${update.issueReviewId}:`, err)
      }
    }

    return updatedIssues
  } catch (error) {
    console.error('Error updating issue statuses:', error)
    throw error
  }
}
