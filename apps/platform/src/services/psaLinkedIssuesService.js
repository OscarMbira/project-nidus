/**
 * PSA Linked Issues Service
 * API functions for managing linked issues in Product Status Accounts
 */

import { supabase } from './supabaseClient'

/**
 * Link issue to Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @param {string} issueId - Issue ID
 * @param {string} issueType - Issue type ('issue', 'blocker', 'risk', 'change_request')
 * @param {string} impactOnProduct - Impact description (optional)
 * @returns {Promise<Object>} Linked issue
 */
export async function linkIssue(psaId, issueId, issueType = 'issue', impactOnProduct = null) {
  try {
    // Get issue summary
    const { data: issue } = await supabase
      .from('issues')
      .select('id, issue_title, issue_description')
      .eq('id', issueId)
      .eq('is_deleted', false)
      .single()

    if (!issue) {
      return { success: false, error: 'Issue not found' }
    }

    const { data, error } = await supabase
      .from('psa_linked_issues')
      .insert({
        product_status_account_id: psaId,
        issue_id: issueId,
        issue_type: issueType,
        issue_summary: issue.issue_title || issue.issue_description?.substring(0, 500),
        linked_date: new Date().toISOString().split('T')[0],
        impact_on_product: impactOnProduct
      })
      .select(`
        *,
        issue:issue_id(id, issue_title, issue_description, issue_status, priority)
      `)
      .single()

    if (error) throw error

    // Update issue counts in PSA
    await updateIssueCounts(psaId)

    return { success: true, data }
  } catch (error) {
    console.error('Error linking issue:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unlink issue from Product Status Account
 * @param {string} linkId - Link ID
 * @returns {Promise<Object>} Result
 */
export async function unlinkIssue(linkId) {
  try {
    // Get PSA ID before deleting
    const { data: link } = await supabase
      .from('psa_linked_issues')
      .select('product_status_account_id')
      .eq('id', linkId)
      .single()

    if (!link) {
      return { success: false, error: 'Link not found' }
    }

    const { error } = await supabase
      .from('psa_linked_issues')
      .delete()
      .eq('id', linkId)

    if (error) throw error

    // Update issue counts in PSA
    await updateIssueCounts(link.product_status_account_id)

    return { success: true }
  } catch (error) {
    console.error('Error unlinking issue:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get linked issues for Product Status Account
 * @param {string} psaId - Product Status Account ID
 * @returns {Promise<Object>} Linked issues array
 */
export async function getLinkedIssues(psaId) {
  try {
    const { data, error } = await supabase
      .from('psa_linked_issues')
      .select(`
        *,
        issue:issue_id(id, issue_title, issue_description, issue_status, priority, severity)
      `)
      .eq('product_status_account_id', psaId)
      .order('linked_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting linked issues:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update linked issue status
 * @param {string} linkId - Link ID
 * @param {boolean} isResolved - Is resolved
 * @returns {Promise<Object>} Updated link
 */
export async function updateLinkedIssueStatus(linkId, isResolved) {
  try {
    const updateData = {
      is_resolved: isResolved,
      resolved_date: isResolved ? new Date().toISOString().split('T')[0] : null
    }

    // Get PSA ID before updating
    const { data: link } = await supabase
      .from('psa_linked_issues')
      .select('product_status_account_id')
      .eq('id', linkId)
      .single()

    if (!link) {
      return { success: false, error: 'Link not found' }
    }

    const { data, error } = await supabase
      .from('psa_linked_issues')
      .update(updateData)
      .eq('id', linkId)
      .select()
      .single()

    if (error) throw error

    // Update issue counts in PSA
    await updateIssueCounts(link.product_status_account_id)

    return { success: true, data }
  } catch (error) {
    console.error('Error updating linked issue status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update issue and blocker counts in PSA
 * @param {string} psaId - Product Status Account ID
 */
async function updateIssueCounts(psaId) {
  try {
    const { data: linkedIssues } = await supabase
      .from('psa_linked_issues')
      .select('issue_type, is_resolved')
      .eq('product_status_account_id', psaId)
      .eq('is_resolved', false)

    if (linkedIssues) {
      const issueCount = linkedIssues.filter(i => i.issue_type === 'issue' || i.issue_type === 'risk').length
      const blockerCount = linkedIssues.filter(i => i.issue_type === 'blocker').length

      await supabase
        .from('product_status_accounts')
        .update({
          has_issues: issueCount > 0,
          issue_count: issueCount,
          has_blockers: blockerCount > 0,
          blocker_count: blockerCount
        })
        .eq('id', psaId)
    }
  } catch (error) {
    console.error('Error updating issue counts:', error)
  }
}
