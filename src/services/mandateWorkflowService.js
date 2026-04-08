/**
 * Mandate Workflow Service
 * Handles review and approval workflows for Project Mandates
 */

import { platformDb } from './supabase/supabaseClient'

/**
 * Get current user's internal ID from auth user ID
 */
async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user.id
}

/**
 * Get current user id and full_name for audit trail
 */
async function getCurrentUser() {
  const { data: { user: authUser } } = await platformDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')

  const { data: userData, error } = await platformDb
    .from('users')
    .select('id, full_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (error || !userData) throw new Error('User not found')
  return { id: userData.id, full_name: userData.full_name || userData.email || 'Unknown' }
}

/**
 * Submit mandate for review
 */
export async function submitForReview(mandateId, reviewerIds = []) {
  const userId = await getCurrentUserId()
  
  // Update mandate status
  const { data: mandate, error: mandateError } = await platformDb
    .from('project_mandates')
    .update({
      document_status: 'submitted',
      updated_by: userId,
    })
    .eq('id', mandateId)
    .select()
    .single()
  
  if (mandateError) throw mandateError
  
  // Add reviewers if provided
  if (reviewerIds.length > 0) {
    const reviewers = reviewerIds.map((reviewerId, index) => ({
      mandate_id: mandateId,
      reviewer_name: `Reviewer ${index + 1}`, // TODO: Get actual reviewer name
      review_status: 'pending',
      display_order: index,
      created_by: userId,
    }))
    
    const { error: reviewersError } = await platformDb
      .from('mandate_reviewers')
      .insert(reviewers)
    
    if (reviewersError) throw reviewersError
  }
  
  // TODO: Send review notifications
  // await sendReviewNotifications(mandateId)
  
  return mandate
}

/**
 * Review a mandate
 */
export async function reviewMandate(reviewId, reviewerId, status, comments) {
  const userId = await getCurrentUserId()
  
  if (!['reviewed', 'rejected'].includes(status)) {
    throw new Error('Invalid review status')
  }
  
  const { data, error } = await platformDb
    .from('mandate_reviewers')
    .update({
      review_status: status,
      review_comments: comments,
      review_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', reviewId)
    .select()
    .single()
  
  if (error) throw error
  
  // TODO: Send notification when all reviews complete
  
  return data
}

/**
 * Submit mandate for approval
 */
export async function submitForApproval(mandateId, approverId) {
  const user = await getCurrentUser()

  // Check if all reviews are complete
  const { data: reviews, error: reviewsError } = await platformDb
    .from('mandate_reviewers')
    .select('*')
    .eq('mandate_id', mandateId)
    .eq('review_status', 'pending')
  
  if (reviewsError) throw reviewsError
  
  if (reviews && reviews.length > 0) {
    throw new Error('All reviews must be completed before submission for approval')
  }
  
  // Update mandate status
  const { data: mandate, error: mandateError } = await platformDb
    .from('project_mandates')
    .update({
      document_status: 'submitted', // Still submitted until approved
      updated_by: user.id,
    })
    .eq('id', mandateId)
    .select()
    .single()
  
  if (mandateError) throw mandateError
  
  // Create approval record (approver_name set when approved/rejected; here it's the submitter)
  const { data: approval, error: approvalError } = await platformDb
    .from('mandate_approvals')
    .insert({
      mandate_id: mandateId,
      approver_name: user.full_name,
      approval_status: 'pending',
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()
  
  if (approvalError) throw approvalError
  
  // TODO: Send approval notifications
  // await sendApprovalNotifications(mandateId)
  
  return { mandate, approval }
}

/**
 * Approve a mandate
 * @param {string} approvalId - mandate_approvals id
 * @param {string} [approverId] - unused, kept for API compatibility
 * @param {string} [comments] - approval comments
 * @param {string} [ipAddress] - client IP for audit trail (optional)
 */
export async function approveMandate(approvalId, approverId, comments, ipAddress) {
  const user = await getCurrentUser()
  const now = new Date().toISOString()
  const updatePayload = {
    approval_status: 'approved',
    approval_comments: comments,
    approval_date: now.split('T')[0],
    approval_at: now,
    approver_name: user.full_name,
    updated_by: user.id,
  }
  if (ipAddress != null && String(ipAddress).trim() !== '') {
    updatePayload.approval_ip_address = String(ipAddress).trim().slice(0, 45)
  }
  // Update approval record
  const { data: approval, error: approvalError } = await platformDb
    .from('mandate_approvals')
    .update(updatePayload)
    .eq('id', approvalId)
    .select()
    .single()
  
  if (approvalError) throw approvalError
  
  // Update mandate status
  const { data: mandate, error: mandateError } = await platformDb
    .from('project_mandates')
    .update({
      document_status: 'approved',
      updated_by: userId,
    })
    .eq('id', approval.mandate_id)
    .select()
    .single()
  
  if (mandateError) throw mandateError
  
  // TODO: Send approval notifications
  // await sendApprovalNotifications(approval.mandate_id)
  
  return { mandate, approval }
}

/**
 * Reject a mandate
 * @param {string} approvalId - mandate_approvals id
 * @param {string} [approverId] - unused, kept for API compatibility
 * @param {string} [comments] - rejection comments
 * @param {string} [ipAddress] - client IP for audit trail (optional)
 */
export async function rejectMandate(approvalId, approverId, comments, ipAddress) {
  const user = await getCurrentUser()
  const now = new Date().toISOString()
  const updatePayload = {
    approval_status: 'rejected',
    approval_comments: comments,
    approval_date: now.split('T')[0],
    approval_at: now,
    approver_name: user.full_name,
    updated_by: user.id,
  }
  if (ipAddress != null && String(ipAddress).trim() !== '') {
    updatePayload.approval_ip_address = String(ipAddress).trim().slice(0, 45)
  }
  // Update approval record
  const { data: approval, error: approvalError } = await platformDb
    .from('mandate_approvals')
    .update(updatePayload)
    .eq('id', approvalId)
    .select()
    .single()
  
  if (approvalError) throw approvalError
  
  // Update mandate status
  const { data: mandate, error: mandateError } = await platformDb
    .from('project_mandates')
    .update({
      document_status: 'rejected',
      updated_by: userId,
    })
    .eq('id', approval.mandate_id)
    .select()
    .single()
  
  if (mandateError) throw mandateError
  
  // TODO: Send rejection notifications
  
  return { mandate, approval }
}

/**
 * Get review status for a mandate
 */
export async function getReviewStatus(mandateId) {
  const { data, error } = await platformDb
    .from('mandate_reviewers')
    .select('*')
    .eq('mandate_id', mandateId)
    .order('display_order', { ascending: true })
  
  if (error) throw error
  
  const total = data.length
  const completed = data.filter(r => r.review_status !== 'pending').length
  const rejected = data.filter(r => r.review_status === 'rejected').length
  
  return {
    reviewers: data || [],
    total,
    completed,
    rejected,
    pending: total - completed,
    allComplete: completed === total && rejected === 0,
    hasRejection: rejected > 0
  }
}

/**
 * Get approval status for a mandate
 */
export async function getApprovalStatus(mandateId) {
  const { data, error } = await platformDb
    .from('mandate_approvals')
    .select('*')
    .eq('mandate_id', mandateId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return {
    approvals: data || [],
    latest: data && data.length > 0 ? data[0] : null,
    isApproved: data && data.length > 0 && data[0].approval_status === 'approved',
    isRejected: data && data.length > 0 && data[0].approval_status === 'rejected',
    isPending: data && data.length > 0 && data[0].approval_status === 'pending'
  }
}

/**
 * Get pending reviews for a user
 */
export async function getPendingReviews(userId) {
  // TODO: Implement based on reviewer assignment logic
  // For now, return all pending reviews
  const { data, error } = await platformDb
    .from('mandate_reviewers')
    .select(`
      *,
      mandate:mandate_id (
        id,
        mandate_reference,
        mandate_title,
        document_status
      )
    `)
    .eq('review_status', 'pending')
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId) {
  // TODO: Implement based on approver assignment logic
  // For now, return all pending approvals
  const { data, error } = await platformDb
    .from('mandate_approvals')
    .select(`
      *,
      mandate:mandate_id (
        id,
        mandate_reference,
        mandate_title,
        document_status
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Send review notifications (placeholder - to be implemented)
 */
export async function sendReviewNotifications(mandateId) {
  // TODO: Implement notification system
  console.log('Sending review notifications for mandate:', mandateId)
}

/**
 * Send approval notifications (placeholder - to be implemented)
 */
export async function sendApprovalNotifications(mandateId) {
  // TODO: Implement notification system
  console.log('Sending approval notifications for mandate:', mandateId)
}
