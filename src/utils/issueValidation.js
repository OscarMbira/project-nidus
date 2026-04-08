/**
 * Issue Register Validation Utilities
 * Provides validation functions for issue forms and business logic
 */

/**
 * Validates issue title
 * @param {string} title - Issue title
 * @returns {Object} Validation result
 */
export function validateTitle(title) {
  if (!title || title.trim().length === 0) {
    return { valid: false, message: 'Title is required' }
  }
  if (title.trim().length < 10) {
    return { valid: false, message: 'Title must be at least 10 characters' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates issue description
 * @param {string} description - Issue description
 * @returns {Object} Validation result
 */
export function validateDescription(description) {
  if (!description || description.trim().length === 0) {
    return { valid: false, message: 'Description is required' }
  }
  if (description.trim().length < 30) {
    return { valid: false, message: 'Description must be at least 30 characters' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates impact description
 * @param {string} impact - Impact description
 * @returns {Object} Validation result
 */
export function validateImpact(impact) {
  if (!impact || impact.trim().length === 0) {
    return { valid: false, message: 'Impact description is required' }
  }
  if (impact.trim().length < 20) {
    return { valid: false, message: 'Impact description must be at least 20 characters' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates issue type
 * @param {string} type - Issue type
 * @returns {Object} Validation result
 */
export function validateIssueType(type) {
  const validTypes = ['request_for_change', 'off_specification', 'problem_concern']
  if (!type || !validTypes.includes(type)) {
    return { valid: false, message: 'Valid issue type is required' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates priority
 * @param {string} priority - Priority level
 * @returns {Object} Validation result
 */
export function validatePriority(priority) {
  const validPriorities = ['critical', 'high', 'medium', 'low']
  if (!priority || !validPriorities.includes(priority)) {
    return { valid: false, message: 'Priority is required' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates severity
 * @param {string} severity - Severity level
 * @returns {Object} Validation result
 */
export function validateSeverity(severity) {
  const validSeverities = ['critical', 'major', 'moderate', 'minor']
  if (!severity || !validSeverities.includes(severity)) {
    return { valid: false, message: 'Severity is required' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates owner assignment for in-progress issues
 * @param {string} status - Issue status
 * @param {string} ownerId - Owner ID
 * @returns {Object} Validation result
 */
export function validateOwner(status, ownerId) {
  if (status === 'in_progress' && !ownerId) {
    return { valid: false, message: 'Owner must be assigned for issues in progress' }
  }
  return { valid: true, message: '' }
}

/**
 * Validates status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @returns {Object} Validation result
 */
export function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    draft: ['raised', 'cancelled'],
    raised: ['under_assessment', 'cancelled'],
    under_assessment: ['awaiting_decision', 'resolved', 'cancelled'],
    awaiting_decision: ['approved', 'rejected', 'deferred', 'cancelled'],
    approved: ['in_progress', 'cancelled'],
    rejected: ['closed', 'cancelled'],
    deferred: ['raised', 'cancelled'],
    in_progress: ['resolved', 'cancelled'],
    resolved: ['closed', 'reopened'],
    closed: ['reopened', 'cancelled'],
    reopened: ['raised', 'cancelled'],
    cancelled: [] // Cannot transition from cancelled
  }

  const allowed = validTransitions[currentStatus] || []
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      message: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowed.join(', ')}`
    }
  }
  return { valid: true, message: '' }
}

/**
 * Validates complete issue form
 * @param {Object} formData - Form data
 * @returns {Object} Validation result with errors object
 */
export function validateIssueForm(formData) {
  const errors = {}

  // Title validation
  const titleValidation = validateTitle(formData.issue_title)
  if (!titleValidation.valid) {
    errors.issue_title = titleValidation.message
  }

  // Description validation
  const descValidation = validateDescription(formData.issue_description)
  if (!descValidation.valid) {
    errors.issue_description = descValidation.message
  }

  // Impact validation
  const impactValidation = validateImpact(formData.impact_description)
  if (!impactValidation.valid) {
    errors.impact_description = impactValidation.message
  }

  // Issue type validation
  const typeValidation = validateIssueType(formData.issue_type)
  if (!typeValidation.valid) {
    errors.issue_type = typeValidation.message
  }

  // Priority validation
  const priorityValidation = validatePriority(formData.priority)
  if (!priorityValidation.valid) {
    errors.priority = priorityValidation.message
  }

  // Severity validation
  const severityValidation = validateSeverity(formData.severity)
  if (!severityValidation.valid) {
    errors.severity = severityValidation.message
  }

  // Owner validation for in-progress
  const ownerValidation = validateOwner(formData.status || 'raised', formData.owner_id)
  if (!ownerValidation.valid) {
    errors.owner_id = ownerValidation.message
  }

  // Type-specific validations
  if (formData.issue_type === 'off_specification' && !formData.related_product_id) {
    errors.related_product_id = 'Product must be linked for off-specification issues'
  }

  if (formData.issue_type === 'request_for_change' && !formData.cost_impact && !formData.schedule_impact_days) {
    errors.cost_impact = 'RFC must specify cost or schedule impact'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Calculates priority score from priority and severity
 * @param {string} priority - Priority level
 * @param {string} severity - Severity level
 * @returns {string} Combined score: 'very_high', 'high', 'medium', 'low'
 */
export function calculatePriorityScore(priority, severity) {
  const matrix = {
    critical: {
      critical: 'very_high',
      major: 'very_high',
      moderate: 'high',
      minor: 'high'
    },
    high: {
      critical: 'very_high',
      major: 'high',
      moderate: 'high',
      minor: 'medium'
    },
    medium: {
      critical: 'high',
      major: 'high',
      moderate: 'medium',
      minor: 'low'
    },
    low: {
      critical: 'medium',
      major: 'medium',
      moderate: 'low',
      minor: 'low'
    }
  }

  return matrix[priority]?.[severity] || 'medium'
}

/**
 * Checks if issue requires immediate attention
 * @param {string} priority - Priority level
 * @param {string} severity - Severity level
 * @param {string} status - Issue status
 * @returns {boolean}
 */
export function requiresImmediateAttention(priority, severity, status) {
  if (['closed', 'cancelled', 'rejected'].includes(status)) {
    return false
  }
  const score = calculatePriorityScore(priority, severity)
  return ['very_high', 'high'].includes(score)
}

/**
 * Validates action form
 * @param {Object} actionData - Action form data
 * @returns {Object} Validation result
 */
export function validateActionForm(actionData) {
  const errors = {}

  if (!actionData.action_description || actionData.action_description.trim().length < 20) {
    errors.action_description = 'Action description must be at least 20 characters'
  }

  if (!actionData.action_type) {
    errors.action_type = 'Action type is required'
  }

  if (!actionData.target_date) {
    errors.target_date = 'Target date is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validates decision form
 * @param {Object} decisionData - Decision form data
 * @returns {Object} Validation result
 */
export function validateDecisionForm(decisionData) {
  const errors = {}

  if (!decisionData.decision_type) {
    errors.decision_type = 'Decision type is required'
  }

  if (!decisionData.decision_maker_name || decisionData.decision_maker_name.trim().length === 0) {
    errors.decision_maker_name = 'Decision maker name is required'
  }

  if (!decisionData.decision_rationale || decisionData.decision_rationale.trim().length < 20) {
    errors.decision_rationale = 'Decision rationale must be at least 20 characters'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
