/**
 * Daily Log Validation Utilities
 * Comprehensive field validation for Daily Log entries
 */

/**
 * Validate daily log entry form data
 * @param {Object} formData - Entry form data
 * @returns {Object} { valid: boolean, errors: Object, warnings: Object }
 */
export function validateEntry(formData) {
  const errors = {}
  const warnings = {}

  // Entry date validation (required)
  if (!formData.entry_date) {
    errors.entry_date = 'Entry date is required'
  } else {
    const entryDate = new Date(formData.entry_date)
    if (isNaN(entryDate.getTime())) {
      errors.entry_date = 'Invalid entry date'
    }
  }

  // Entry type validation (required)
  if (!formData.entry_type) {
    errors.entry_type = 'Entry type is required'
  }

  // Description validation (required, min 20 characters)
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = 'Description is required'
  } else if (formData.description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters'
    warnings.description = `Description is ${formData.description.trim().length} characters (minimum 20 recommended)`
  }

  // Person responsible warnings (for actionable entries)
  const actionableTypes = ['problem', 'action']
  if (actionableTypes.includes(formData.entry_type)) {
    if (!formData.person_responsible_id && !formData.person_responsible_name) {
      warnings.person_responsible = 'No person responsible assigned. Consider assigning someone to handle this.'
    }
  }

  // Target date warnings (for actionable entries)
  if (actionableTypes.includes(formData.entry_type)) {
    if (!formData.target_date) {
      warnings.target_date = 'No target date set. When should this be resolved?'
    } else {
      const targetDate = new Date(formData.target_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (targetDate < today) {
        warnings.target_date = 'Target date is in the past'
      }
    }
  }

  // Priority validation
  if (formData.priority && !['low', 'medium', 'high'].includes(formData.priority)) {
    errors.priority = 'Priority must be low, medium, or high'
  }

  // Target date validation (if provided)
  if (formData.target_date) {
    const targetDate = new Date(formData.target_date)
    if (isNaN(targetDate.getTime())) {
      errors.target_date = 'Invalid target date'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

/**
 * Get entry completeness status
 * @param {Object} entry - Entry object
 * @returns {Object} { complete: boolean, missing: string[], warnings: string[] }
 */
export function getEntryCompleteness(entry) {
  const missing = []
  const warnings = []

  // Required fields check
  if (!entry.description || entry.description.trim().length < 20) {
    missing.push('Description (minimum 20 characters)')
  }

  if (!entry.entry_type) {
    missing.push('Entry type')
  }

  if (!entry.entry_date) {
    missing.push('Entry date')
  }

  // Warnings for actionable entries
  const actionableTypes = ['problem', 'action']
  if (actionableTypes.includes(entry.entry_type)) {
    if (!entry.person_responsible_id && !entry.person_responsible_name) {
      warnings.push('No person responsible assigned')
    }

    if (!entry.target_date) {
      warnings.push('No target date set')
    }
  }

  // Overdue check
  if (entry.target_date) {
    const targetDate = new Date(entry.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (targetDate < today && entry.status !== 'completed' && entry.status !== 'cancelled') {
      const daysOverdue = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24))
      warnings.push(`Entry is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`)
    }
  }

  // Stale entry check (open for more than 30 days)
  if (entry.status === 'open' && entry.created_at) {
    const createdDate = new Date(entry.created_at)
    const today = new Date()
    const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24))

    if (daysOld > 30) {
      warnings.push(`Entry has been open for ${daysOld} days - consider resolving or escalating`)
    }
  }

  // Access rights check
  if (entry.is_private === undefined || entry.is_private === null) {
    warnings.push('Visibility setting not explicitly set')
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Check if entry needs immediate attention
 * @param {Object} entry - Entry object
 * @returns {boolean}
 */
export function needsImmediateAttention(entry) {
  if (entry.status === 'completed' || entry.status === 'cancelled') {
    return false
  }

  // High priority
  if (entry.priority === 'high') {
    return true
  }

  // Overdue
  if (entry.target_date) {
    const targetDate = new Date(entry.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (targetDate < today) {
      return true
    }
  }

  // Stale (open > 30 days)
  if (entry.status === 'open' && entry.created_at) {
    const createdDate = new Date(entry.created_at)
    const today = new Date()
    const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24))

    if (daysOld > 30) {
      return true
    }
  }

  return false
}

/**
 * Check if entry is overdue
 * @param {Object} entry - Entry object
 * @returns {Object} { overdue: boolean, daysOverdue: number }
 */
export function isEntryOverdue(entry) {
  if (!entry.target_date) {
    return { overdue: false, daysOverdue: 0 }
  }

  if (entry.status === 'completed' || entry.status === 'cancelled') {
    return { overdue: false, daysOverdue: 0 }
  }

  const targetDate = new Date(entry.target_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)

  if (targetDate < today) {
    const daysOverdue = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24))
    return { overdue: true, daysOverdue }
  }

  return { overdue: false, daysOverdue: 0 }
}

/**
 * Get quality criteria validation result
 * Matches template quality criteria format
 * @param {Object} entry - Entry object
 * @returns {Object} Quality criteria validation result
 */
export function getQualityCriteria(entry) {
  const criteria = []

  // Criterion 1: Entries are sufficiently documented
  const descriptionLength = entry.description ? entry.description.trim().length : 0
  const hasSufficientDescription = descriptionLength >= 20
  criteria.push({
    criterion: 'Entries are sufficiently documented',
    pass: hasSufficientDescription,
    notes: hasSufficientDescription 
      ? `Description is ${descriptionLength} characters` 
      : `Description is only ${descriptionLength} characters (minimum 20 required)`
  })

  // Criterion 2: Date, person responsible and target date filled in
  const hasEntryDate = !!entry.entry_date
  const hasPersonResponsible = !!(entry.person_responsible_id || entry.person_responsible_name)
  const hasTargetDate = !!entry.target_date

  const actionableTypes = ['problem', 'action']
  const isActionable = actionableTypes.includes(entry.entry_type)

  let dateResponsibilityNotes = []
  if (!hasEntryDate) dateResponsibilityNotes.push('Entry date missing')
  if (isActionable && !hasPersonResponsible) dateResponsibilityNotes.push('Person responsible missing')
  if (isActionable && !hasTargetDate) dateResponsibilityNotes.push('Target date missing')

  const hasAllRequiredFields = hasEntryDate && (!isActionable || (hasPersonResponsible && hasTargetDate))
  
  criteria.push({
    criterion: 'Date, person responsible and target date filled in',
    pass: hasAllRequiredFields,
    passLevel: isActionable && (!hasPersonResponsible || !hasTargetDate) ? 'warning' : 'yes',
    notes: dateResponsibilityNotes.length > 0 
      ? dateResponsibilityNotes.join(', ') 
      : 'All required fields present'
  })

  // Criterion 3: Access rights considered
  const visibilitySet = entry.is_private !== undefined && entry.is_private !== null
  const visibilityNotes = visibilitySet 
    ? (entry.is_private ? 'Entry marked as private' : 'Entry visible to team')
    : 'Visibility setting not explicitly set'

  criteria.push({
    criterion: 'Access rights considered',
    pass: visibilitySet,
    notes: visibilityNotes
  })

  return {
    allPass: criteria.every(c => c.pass),
    criteria,
    overallStatus: criteria.every(c => c.pass) ? 'pass' : 'warning'
  }
}

/**
 * Validate entry for completion
 * @param {Object} entry - Entry object
 * @returns {Object} Validation result
 */
export function validateEntryForCompletion(entry) {
  const errors = {}

  if (!entry.results || entry.results.trim().length === 0) {
    errors.results = 'Results/outcome description is required to complete an entry'
  } else if (entry.results.trim().length < 10) {
    errors.results = 'Results description should be at least 10 characters'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
