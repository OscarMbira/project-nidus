/**
 * Risk Validation Utilities
 * Comprehensive field validation for Risk Register
 */

/**
 * Validate risk form data
 * @param {Object} formData - Risk form data
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateRisk(formData) {
  const errors = {}

  // Title validation
  if (!formData.risk_title || formData.risk_title.trim().length < 10) {
    errors.risk_title = 'Risk title must be at least 10 characters'
  }

  // Cause-Event-Effect validation
  if (!formData.cause_description || formData.cause_description.trim().length < 30) {
    errors.cause_description = 'Cause description must be at least 30 characters'
  }

  if (!formData.event_description || formData.event_description.trim().length < 30) {
    errors.event_description = 'Event description must be at least 30 characters'
  }

  if (!formData.effect_description || formData.effect_description.trim().length < 30) {
    errors.effect_description = 'Effect description must be at least 30 characters'
  }

  // Category validation
  if (!formData.risk_category) {
    errors.risk_category = 'Risk category is required'
  }

  // Pre-response assessment validation
  if (!formData.pre_probability || formData.pre_probability < 1 || formData.pre_probability > 5) {
    errors.pre_probability = 'Probability must be between 1 and 5'
  }

  if (!formData.pre_impact || formData.pre_impact < 1 || formData.pre_impact > 5) {
    errors.pre_impact = 'Impact must be between 1 and 5'
  }

  // Response category validation
  if (!formData.response_category) {
    errors.response_category = 'Response category is required'
  }

  // Validate response category matches risk type
  if (formData.response_category && formData.risk_type) {
    const threatResponses = ['avoid', 'reduce', 'fallback', 'transfer', 'accept', 'share']
    const opportunityResponses = ['exploit', 'enhance', 'share', 'reject']

    if (formData.risk_type === 'threat' && !threatResponses.includes(formData.response_category)) {
      errors.response_category = 'Response category must be appropriate for threats (avoid, reduce, fallback, transfer, accept, share)'
    }

    if (formData.risk_type === 'opportunity' && !opportunityResponses.includes(formData.response_category)) {
      errors.response_category = 'Response category must be appropriate for opportunities (exploit, enhance, share, reject)'
    }
  }

  // Owner validation
  if (!formData.risk_owner_id) {
    errors.risk_owner_id = 'Risk owner is required'
  }

  // Proximity validation
  if (!formData.proximity) {
    errors.proximity = 'Proximity is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate response action
 * @param {Object} responseData - Response action data
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateResponse(responseData) {
  const errors = {}

  if (!responseData.action_description || responseData.action_description.trim().length < 20) {
    errors.action_description = 'Action description must be at least 20 characters'
  }

  if (!responseData.action_type) {
    errors.action_type = 'Action type is required'
  }

  if (!responseData.target_date) {
    errors.target_date = 'Target date is required'
  } else {
    const targetDate = new Date(responseData.target_date)
    if (isNaN(targetDate.getTime())) {
      errors.target_date = 'Invalid target date'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Get risk completeness status
 * @param {Object} risk - Risk object
 * @returns {Object} { complete: boolean, missing: string[], warnings: string[] }
 */
export function getRiskCompleteness(risk) {
  const missing = []
  const warnings = []

  // Required fields
  if (!risk.risk_title || risk.risk_title.trim().length < 10) {
    missing.push('Risk title (min 10 characters)')
  }

  if (!risk.cause_description || risk.cause_description.trim().length < 30) {
    missing.push('Cause description (min 30 characters)')
  }

  if (!risk.event_description || risk.event_description.trim().length < 30) {
    missing.push('Event description (min 30 characters)')
  }

  if (!risk.effect_description || risk.effect_description.trim().length < 30) {
    missing.push('Effect description (min 30 characters)')
  }

  if (!risk.risk_category) {
    missing.push('Risk category')
  }

  if (!risk.pre_probability || risk.pre_probability < 1 || risk.pre_probability > 5) {
    missing.push('Pre-response probability (1-5)')
  }

  if (!risk.pre_impact || risk.pre_impact < 1 || risk.pre_impact > 5) {
    missing.push('Pre-response impact (1-5)')
  }

  if (!risk.response_category) {
    missing.push('Response category')
  }

  if (!risk.risk_owner_id) {
    missing.push('Risk owner')
  }

  if (!risk.proximity) {
    missing.push('Proximity')
  }

  // Warnings
  const riskScore = (risk.pre_expected_value || (risk.pre_probability && risk.pre_impact ? risk.pre_probability * risk.pre_impact : 0))
  if (riskScore >= 12 && !risk.response_strategy) {
    warnings.push('High risk without detailed response strategy')
  }

  if (riskScore >= 12 && !risk.pre_probability_rationale) {
    warnings.push('High risk probability assessment missing rationale')
  }

  if (riskScore >= 12 && !risk.pre_impact_rationale) {
    warnings.push('High risk impact assessment missing rationale')
  }

  // Check for post-response assessment if responses completed
  // (This would need to check response status)

  return {
    complete: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Check if risk needs immediate attention
 * @param {Object} risk - Risk object
 * @returns {boolean}
 */
export function needsImmediateAttention(risk) {
  const riskScore = risk.pre_expected_value || (risk.pre_probability && risk.pre_impact ? risk.pre_probability * risk.pre_impact : 0)
  const isHighRisk = riskScore >= 12
  const isActive = !['closed', 'expired', 'occurred'].includes(risk.status_enum || risk.status || '')
  const hasNoResponse = !risk.response_category || !risk.response_strategy
  const isImminent = risk.proximity === 'imminent' || (risk.proximity_date && new Date(risk.proximity_date) <= new Date(new Date().setDate(new Date().getDate() + 7)))

  return isActive && (isHighRisk || (isHighRisk && hasNoResponse) || isImminent)
}
