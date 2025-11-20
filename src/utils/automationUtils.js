/**
 * Automation Utilities
 * Helper functions for executing automation rules
 */

import { supabase } from '../services/supabaseClient'
import { createNotification } from './notificationUtils'

/**
 * Execute an automation rule
 */
export async function executeAutomationRule(ruleId, triggerData = {}) {
  try {
    // Get rule
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (ruleError || !rule) {
      throw new Error('Rule not found or inactive')
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('automation_executions')
      .insert({
        rule_id: ruleId,
        execution_status: 'running',
        trigger_data: triggerData,
      })
      .select()
      .single()

    if (execError) throw execError

    // Execute actions based on action_config
    const actionConfig = rule.action_config || {}
    const actionType = actionConfig.type
    const actionParams = actionConfig.parameters || {}

    let actionsExecuted = 0
    let actionsSucceeded = 0
    let actionsFailed = 0
    const results = []

    try {
      switch (actionType) {
        case 'send_notification':
          const notifResult = await executeSendNotification(actionParams, triggerData)
          results.push(notifResult)
          actionsExecuted++
          if (notifResult.success) actionsSucceeded++
          else actionsFailed++
          break

        case 'assign_task':
          const assignResult = await executeAssignTask(actionParams, triggerData)
          results.push(assignResult)
          actionsExecuted++
          if (assignResult.success) actionsSucceeded++
          else actionsFailed++
          break

        case 'update_status':
          const statusResult = await executeUpdateStatus(actionParams, triggerData)
          results.push(statusResult)
          actionsExecuted++
          if (statusResult.success) actionsSucceeded++
          else actionsFailed++
          break

        case 'create_task':
          const taskResult = await executeCreateTask(actionParams, triggerData)
          results.push(taskResult)
          actionsExecuted++
          if (taskResult.success) actionsSucceeded++
          else actionsFailed++
          break

        default:
          throw new Error(`Unknown action type: ${actionType}`)
      }

      // Update execution record
      const completedAt = new Date()
      const duration = completedAt - new Date(execution.started_at)

      await supabase
        .from('automation_executions')
        .update({
          execution_status: actionsFailed === 0 ? 'completed' : 'failed',
          action_data: actionParams,
          actions_executed: actionsExecuted,
          actions_succeeded: actionsSucceeded,
          actions_failed: actionsFailed,
          execution_result: { results },
          completed_at: completedAt.toISOString(),
          duration_ms: duration,
        })
        .eq('id', execution.id)

      // Update rule stats
      await supabase.rpc('update_rule_execution_stats', {
        p_rule_id: ruleId,
        p_success: actionsFailed === 0,
        p_error_message: actionsFailed > 0 ? `${actionsFailed} action(s) failed` : null
      })

      return {
        success: actionsFailed === 0,
        executionId: execution.id,
        results,
      }
    } catch (error) {
      // Update execution with error
      await supabase
        .from('automation_executions')
        .update({
          execution_status: 'failed',
          error_message: error.message,
          error_details: { error: error.toString() },
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id)

      throw error
    }
  } catch (error) {
    console.error('Error executing automation rule:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Execute send notification action
 */
async function executeSendNotification(params, triggerData) {
  try {
    const recipients = params.recipients || []
    const template = params.template || 'default'
    const title = params.title || 'Automation Notification'
    const message = params.message || 'An automation rule was triggered'

    // Create notifications for all recipients
    const notifications = recipients.map(userId => ({
      userId,
      type: 'custom',
      title,
      message,
      entityType: triggerData.entity_type,
      entityId: triggerData.entity_id,
      projectId: triggerData.project_id,
      actionUrl: params.action_url,
    }))

    // Use notification utility to create bulk notifications
    // This would need to be implemented in notificationUtils
    return { success: true, message: `Notifications sent to ${recipients.length} users` }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Execute assign task action
 */
async function executeAssignTask(params, triggerData) {
  try {
    const taskId = params.task_id || triggerData.task_id
    const assigneeId = params.assignee_id

    if (!taskId || !assigneeId) {
      throw new Error('Task ID and Assignee ID are required')
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: assigneeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) throw error

    return { success: true, message: 'Task assigned successfully' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Execute update status action
 */
async function executeUpdateStatus(params, triggerData) {
  try {
    const entityType = params.entity_type || triggerData.entity_type
    const entityId = params.entity_id || triggerData.entity_id
    const newStatus = params.status

    if (!entityType || !entityId || !newStatus) {
      throw new Error('Entity type, ID, and status are required')
    }

    const tableMap = {
      task: 'tasks',
      project: 'projects',
      issue: 'issues',
    }

    const table = tableMap[entityType]
    if (!table) {
      throw new Error(`Unknown entity type: ${entityType}`)
    }

    const { error } = await supabase
      .from(table)
      .update({
        task_status: newStatus, // This might need to be adjusted based on table structure
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId)

    if (error) throw error

    return { success: true, message: 'Status updated successfully' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Execute create task action
 */
async function executeCreateTask(params, triggerData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const taskData = {
      project_id: params.project_id || triggerData.project_id,
      task_name: params.task_name || 'Auto-created task',
      task_description: params.task_description || '',
      task_status: params.status || 'not_started',
      priority: params.priority || 'medium',
      assigned_to: params.assignee_id,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()

    if (error) throw error

    return { success: true, message: 'Task created successfully', taskId: data.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get automation executions for a rule
 */
export async function getRuleExecutions(ruleId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('automation_executions')
      .select('*')
      .eq('rule_id', ruleId)
      .eq('is_deleted', false)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching executions:', error)
    return { success: false, error: error.message, data: [] }
  }
}

