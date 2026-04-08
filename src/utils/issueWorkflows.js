/**
 * Issue Workflow Utilities
 * Provides workflow logic for different issue types
 */

/**
 * RFC Workflow States
 */
export const RFC_WORKFLOW = {
  states: ['draft', 'raised', 'under_assessment', 'awaiting_decision', 'approved', 'in_progress', 'resolved', 'closed'],
  transitions: {
    draft: ['raised', 'cancelled'],
    raised: ['under_assessment', 'cancelled'],
    under_assessment: ['awaiting_decision', 'cancelled'],
    awaiting_decision: ['approved', 'rejected', 'deferred', 'cancelled'],
    approved: ['in_progress', 'cancelled'],
    in_progress: ['resolved', 'cancelled'],
    resolved: ['closed'],
    closed: ['reopened'],
    rejected: ['closed'],
    deferred: ['raised']
  },
  requiredActions: {
    awaiting_decision: ['decision'],
    approved: ['change_request'],
    in_progress: ['actions']
  }
}

/**
 * Off-Spec Workflow States
 */
export const OFF_SPEC_WORKFLOW = {
  states: ['draft', 'raised', 'under_assessment', 'awaiting_decision', 'approved', 'in_progress', 'resolved', 'closed'],
  transitions: {
    draft: ['raised', 'cancelled'],
    raised: ['under_assessment', 'cancelled'],
    under_assessment: ['awaiting_decision', 'resolved', 'cancelled'], // Can resolve directly if concession accepted
    awaiting_decision: ['approved', 'rejected', 'deferred', 'cancelled'],
    approved: ['in_progress', 'cancelled'],
    in_progress: ['resolved', 'cancelled'],
    resolved: ['closed'],
    closed: ['reopened'],
    rejected: ['closed'],
    deferred: ['raised']
  },
  requiredActions: {
    awaiting_decision: ['decision'], // Concession or fix decision
    in_progress: ['actions'] // Corrective actions
  }
}

/**
 * Problem/Concern Workflow States
 */
export const PROBLEM_WORKFLOW = {
  states: ['draft', 'raised', 'under_assessment', 'in_progress', 'resolved', 'closed'],
  transitions: {
    draft: ['raised', 'cancelled'],
    raised: ['under_assessment', 'cancelled'],
    under_assessment: ['in_progress', 'resolved', 'cancelled'], // Can resolve directly
    in_progress: ['resolved', 'cancelled'],
    resolved: ['closed'],
    closed: ['reopened']
  },
  requiredActions: {
    in_progress: ['actions']
  }
}

/**
 * Get workflow for issue type
 */
export function getWorkflow(issueType) {
  switch (issueType) {
    case 'request_for_change':
      return RFC_WORKFLOW
    case 'off_specification':
      return OFF_SPEC_WORKFLOW
    case 'problem_concern':
      return PROBLEM_WORKFLOW
    default:
      return PROBLEM_WORKFLOW
  }
}

/**
 * Check if transition is valid for issue type
 */
export function isValidTransition(issueType, currentStatus, newStatus) {
  const workflow = getWorkflow(issueType)
  const allowed = workflow.transitions[currentStatus] || []
  return allowed.includes(newStatus)
}

/**
 * Get next valid statuses for an issue
 */
export function getNextValidStatuses(issueType, currentStatus) {
  const workflow = getWorkflow(issueType)
  return workflow.transitions[currentStatus] || []
}

/**
 * Check if issue requires specific action at current status
 */
export function requiresAction(issueType, status) {
  const workflow = getWorkflow(issueType)
  return Object.keys(workflow.requiredActions).includes(status)
}

/**
 * Get required action types for status
 */
export function getRequiredActions(issueType, status) {
  const workflow = getWorkflow(issueType)
  return workflow.requiredActions[status] || []
}
