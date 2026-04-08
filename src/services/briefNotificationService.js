/**
 * Brief Notification Service
 * Handles email notifications for brief-related events
 */

import { supabase } from './supabaseClient'

/**
 * Send notification when brief is submitted for approval
 */
export async function notifyBriefSubmitted(briefId, approverIds = []) {
  try {
    // Get brief details
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        author:users!project_briefs_author_id_fkey(id, full_name, email)
      `)
      .eq('id', briefId)
      .single()

    if (briefError) throw briefError

    // Get approvers
    const approvers = []
    if (approverIds.length > 0) {
      const { data: approverData, error: approverError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', approverIds)

      if (!approverError && approverData) {
        approvers.push(...approverData)
      }
    }

    // If no specific approvers, get PMO admins
    if (approvers.length === 0) {
      const { data: pmoAdmins } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .limit(10) // Limit to avoid too many notifications

      if (pmoAdmins) {
        approvers.push(...pmoAdmins)
      }
    }

    // Create notification records (for in-app notifications)
    const notifications = approvers.map(approver => ({
      user_id: approver.id,
      notification_type: 'brief_submitted',
      title: 'Project Brief Submitted for Approval',
      message: `Brief ${brief.brief_reference} for project ${brief.project?.project_name || 'N/A'} has been submitted for approval.`,
      related_entity_type: 'project_brief',
      related_entity_id: briefId,
      is_read: false
    }))

    if (notifications.length > 0) {
      // Note: This assumes a notifications table exists
      // If not, you can use Supabase Realtime or another notification system
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.warn('Could not create notification records:', notifError)
        // Continue even if notification records fail
      }
    }

    // TODO: Send actual emails via email service
    // This would integrate with your email provider (SendGrid, AWS SES, etc.)
    // For now, we just log the notification
    console.log('Brief submitted notification:', {
      briefId,
      briefReference: brief.brief_reference,
      approvers: approvers.map(a => a.email)
    })

    return {
      success: true,
      notificationsSent: approvers.length
    }
  } catch (error) {
    console.error('Error sending brief submitted notification:', error)
    throw error
  }
}

/**
 * Send notification when brief is approved
 */
export async function notifyBriefApproved(briefId, approverId) {
  try {
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email)
      `)
      .eq('id', briefId)
      .single()

    if (briefError) throw briefError

    const recipients = [
      brief.author,
      brief.owner
    ].filter(Boolean).map(u => u.id)

    const notifications = recipients.map(userId => ({
      user_id: userId,
      notification_type: 'brief_approved',
      title: 'Project Brief Approved',
      message: `Brief ${brief.brief_reference} has been approved.`,
      related_entity_type: 'project_brief',
      related_entity_id: briefId,
      is_read: false
    }))

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.warn('Could not create notification records:', notifError)
      }
    }

    console.log('Brief approved notification:', {
      briefId,
      briefReference: brief.brief_reference,
      recipients: recipients
    })

    return { success: true, notificationsSent: recipients.length }
  } catch (error) {
    console.error('Error sending brief approved notification:', error)
    throw error
  }
}

/**
 * Send notification when brief is rejected
 */
export async function notifyBriefRejected(briefId, approverId, rejectionReason) {
  try {
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email)
      `)
      .eq('id', briefId)
      .single()

    if (briefError) throw briefError

    const recipients = [
      brief.author,
      brief.owner
    ].filter(Boolean).map(u => u.id)

    const notifications = recipients.map(userId => ({
      user_id: userId,
      notification_type: 'brief_rejected',
      title: 'Project Brief Rejected',
      message: `Brief ${brief.brief_reference} has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
      related_entity_type: 'project_brief',
      related_entity_id: briefId,
      is_read: false
    }))

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.warn('Could not create notification records:', notifError)
      }
    }

    console.log('Brief rejected notification:', {
      briefId,
      briefReference: brief.brief_reference,
      recipients: recipients,
      reason: rejectionReason
    })

    return { success: true, notificationsSent: recipients.length }
  } catch (error) {
    console.error('Error sending brief rejected notification:', error)
    throw error
  }
}

/**
 * Send notification when brief requires changes
 */
export async function notifyBriefChangesRequested(briefId, approverId, changeRequest) {
  try {
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        author:users!project_briefs_author_id_fkey(id, full_name, email),
        owner:users!project_briefs_owner_id_fkey(id, full_name, email)
      `)
      .eq('id', briefId)
      .single()

    if (briefError) throw briefError

    const recipients = [
      brief.author,
      brief.owner
    ].filter(Boolean).map(u => u.id)

    const notifications = recipients.map(userId => ({
      user_id: userId,
      notification_type: 'brief_changes_requested',
      title: 'Changes Requested for Project Brief',
      message: `Changes have been requested for brief ${brief.brief_reference}. ${changeRequest || ''}`,
      related_entity_type: 'project_brief',
      related_entity_id: briefId,
      is_read: false
    }))

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.warn('Could not create notification records:', notifError)
      }
    }

    console.log('Brief changes requested notification:', {
      briefId,
      briefReference: brief.brief_reference,
      recipients: recipients
    })

    return { success: true, notificationsSent: recipients.length }
  } catch (error) {
    console.error('Error sending brief changes requested notification:', error)
    throw error
  }
}
