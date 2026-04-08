/**
 * Notification Utilities
 * Handles notification creation and management
 */

import { supabase } from '../services/supabaseClient'

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 */
export async function createNotification(notificationData) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.userId,
        notification_type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        related_entity_type: notificationData.entityType,
        related_entity_id: notificationData.entityId,
        project_id: notificationData.projectId,
        sender_id: notificationData.senderId,
        sender_name: notificationData.senderName,
        action_url: notificationData.actionUrl,
        action_label: notificationData.actionLabel || 'View',
        priority: notificationData.priority || 1,
        delivery_method: notificationData.deliveryMethod || 'in_app',
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, notification: data }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(notifications) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications.map(n => ({
        user_id: n.userId,
        notification_type: n.type,
        title: n.title,
        message: n.message,
        related_entity_type: n.entityType,
        related_entity_id: n.entityId,
        project_id: n.projectId,
        sender_id: n.senderId,
        sender_name: n.senderName,
        action_url: n.actionUrl,
        action_label: n.actionLabel || 'View',
        priority: n.priority || 1,
        delivery_method: n.deliveryMethod || 'in_app',
      })))
      .select()

    if (error) throw error
    return { success: true, notifications: data }
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Notify task assignee when task is assigned
 */
export async function notifyTaskAssigned(taskId, assigneeId, projectId, assignedById) {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('task_name')
      .eq('id', taskId)
      .single()

    const { data: assigner } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', assignedById)
      .single()

    return await createNotification({
      userId: assigneeId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `${assigner?.full_name || 'Someone'} assigned you a task: ${task?.task_name || 'Untitled Task'}`,
      entityType: 'task',
      entityId: taskId,
      projectId: projectId,
      senderId: assignedById,
      senderName: assigner?.full_name || assigner?.email,
      actionUrl: `/projects/${projectId}/tasks/${taskId}`,
      actionLabel: 'View Task',
      priority: 2,
    })
  } catch (error) {
    console.error('Error notifying task assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Notify when task status changes
 */
export async function notifyTaskStatusChange(taskId, oldStatus, newStatus, projectId, changedById) {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('task_name, assigned_to')
      .eq('id', taskId)
      .single()

    if (!task?.assigned_to) return { success: true } // No assignee to notify

    const { data: changer } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', changedById)
      .single()

    return await createNotification({
      userId: task.assigned_to,
      type: 'status_change',
      title: 'Task Status Changed',
      message: `${changer?.full_name || 'Someone'} changed "${task.task_name}" from ${oldStatus} to ${newStatus}`,
      entityType: 'task',
      entityId: taskId,
      projectId: projectId,
      senderId: changedById,
      senderName: changer?.full_name || changer?.email,
      actionUrl: `/projects/${projectId}/tasks/${taskId}`,
      actionLabel: 'View Task',
      priority: 1,
    })
  } catch (error) {
    console.error('Error notifying task status change:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Notify when comment is added
 */
export async function notifyCommentAdded(commentId, entityType, entityId, projectId, commenterId) {
  try {
    // Get comment details
    const { data: comment } = await supabase
      .from('comments')
      .select('comment_text, created_by')
      .eq('id', commentId)
      .single()

    // Get commenter info
    const { data: commenter } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', commenterId)
      .single()

    // Get entity details to find who to notify
    let entityQuery
    if (entityType === 'task') {
      entityQuery = supabase.from('tasks').select('task_name, assigned_to, created_by').eq('id', entityId).single()
    } else if (entityType === 'issue') {
      entityQuery = supabase.from('issues').select('issue_title, assigned_to, created_by').eq('id', entityId).single()
    } else {
      return { success: true } // Unknown entity type
    }

    const { data: entity } = await entityQuery

    // Notify entity owner and assignee (if different from commenter)
    const notifyUserIds = []
    if (entity?.created_by && entity.created_by !== commenterId) {
      notifyUserIds.push(entity.created_by)
    }
    if (entity?.assigned_to && entity.assigned_to !== commenterId && entity.assigned_to !== entity.created_by) {
      notifyUserIds.push(entity.assigned_to)
    }

    if (notifyUserIds.length === 0) return { success: true }

    // Get all commenters on this entity to notify them too
    const { data: otherComments } = await supabase
      .from('comments')
      .select('created_by')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .neq('created_by', commenterId)
      .eq('is_deleted', false)

    const commenterIds = [...new Set((otherComments || []).map(c => c.created_by))]
    commenterIds.forEach(id => {
      if (!notifyUserIds.includes(id)) notifyUserIds.push(id)
    })

    // Create notifications
    const notifications = notifyUserIds.map(userId => ({
      userId,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenter?.full_name || 'Someone'} commented on ${entityType === 'task' ? entity.task_name : entity.issue_title}`,
      entityType: entityType,
      entityId: entityId,
      projectId: projectId,
      senderId: commenterId,
      senderName: commenter?.full_name || commenter?.email,
      actionUrl: `/projects/${projectId}/${entityType}s/${entityId}`,
      actionLabel: 'View',
      priority: 1,
    }))

    return await createBulkNotifications(notifications)
  } catch (error) {
    console.error('Error notifying comment added:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    // Get internal user ID from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userRecord) {
      // User record not found, return 0 silently
      return 0
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userRecord.id)
      .eq('is_read', false)
      .eq('is_deleted', false)

    if (error) {
      // Silently fail - don't log 500 errors that might be RLS related
      if (error.code !== 'PGRST116' && error.status !== 500) {
        console.error('Error getting unread count:', error)
      }
      return 0
    }
    return count || 0
  } catch (error) {
    // Silently fail - don't log errors that might be RLS related
    return 0
  }
}

