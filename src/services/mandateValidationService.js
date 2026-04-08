/**
 * Mandate Validation Service
 * Comprehensive validation functions for mandate completion checks
 * Works for both Platform and Simulator
 */

/**
 * Validates a single section of the mandate
 */
export function validateSection(sectionName, mandateData, childData = {}) {
  const errors = []
  const warnings = []

  switch (sectionName) {
    case 'purpose':
      if (!mandateData.purpose || mandateData.purpose.trim().length < 20) {
        errors.push('Purpose must be at least 20 characters')
      }
      break

    case 'authority':
      if (!mandateData.authority_responsible || mandateData.authority_responsible.trim().length < 10) {
        warnings.push('Authority Responsible is recommended for approval')
      }
      break

    case 'background':
      if (!mandateData.background || mandateData.background.trim().length < 100) {
        errors.push('Background must be at least 100 characters')
      }
      break

    case 'objectives':
      if (!mandateData.project_objectives || mandateData.project_objectives.trim().length < 100) {
        errors.push('Project Objectives must be at least 100 characters')
      }
      break

    case 'scope':
      const deliverables = childData.deliverables || []
      const inScopeDeliverables = deliverables.filter(d => d.is_in_scope !== false)
      if (inScopeDeliverables.length === 0) {
        errors.push('At least one in-scope deliverable is required')
      }
      break

    case 'constraints':
      if (!mandateData.constraints || mandateData.constraints.trim().length < 20) {
        warnings.push('Constraints are recommended for better project planning')
      }
      break

    case 'interfaces':
      if (mandateData.is_standalone === false && (!mandateData.interfaces || mandateData.interfaces.trim().length < 20)) {
        errors.push('Interfaces are required for programme-linked projects')
      } else if (!mandateData.interfaces || mandateData.interfaces.trim().length < 20) {
        warnings.push('Interfaces are recommended if project interacts with other projects')
      }
      break

    case 'quality':
      if (!mandateData.quality_priority) {
        warnings.push('Quality priority selection is recommended')
      }
      if (!mandateData.quality_expectations || mandateData.quality_expectations.trim().length < 20) {
        warnings.push('Quality expectations are recommended')
      }
      break

    case 'businessCase':
      if (!mandateData.outline_business_case || mandateData.outline_business_case.trim().length < 100) {
        errors.push('Outline Business Case must be at least 100 characters')
      }
      break

    case 'roles':
      if (!mandateData.proposed_executive_id && !mandateData.proposed_executive_name &&
          !mandateData.proposed_pm_id && !mandateData.proposed_pm_name) {
        errors.push('At least one of Proposed Executive or Proposed PM must be specified')
      }
      break

    case 'stakeholders':
      const stakeholders = childData.stakeholders || []
      const customersUsers = stakeholders.filter(s => 
        s.stakeholder_type === 'customer' || s.stakeholder_type === 'user'
      )
      if (customersUsers.length === 0) {
        errors.push('At least one customer or user stakeholder is required')
      }
      break

    default:
      break
  }

  return { errors, warnings, isValid: errors.length === 0 }
}

/**
 * Validates entire mandate for draft save
 */
export function validateDraft(mandateData) {
  const errors = []
  const warnings = []

  if (!mandateData.mandate_title || mandateData.mandate_title.trim().length === 0) {
    errors.push('Mandate title is required')
  }

  if (!mandateData.purpose || mandateData.purpose.trim().length < 20) {
    errors.push('Purpose must be at least 20 characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates mandate for submission (review)
 */
export function validateForSubmission(mandateData, childData = {}) {
  const allErrors = []
  const allWarnings = []

  // Required sections
  const requiredSections = ['purpose', 'background', 'objectives', 'businessCase', 'scope', 'stakeholders']
  
  requiredSections.forEach(section => {
    const result = validateSection(section, mandateData, childData)
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
  })

  // Recommended sections
  const recommendedSections = ['authority', 'constraints', 'quality', 'roles']
  recommendedSections.forEach(section => {
    const result = validateSection(section, mandateData, childData)
    allWarnings.push(...result.warnings)
  })

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

/**
 * Validates mandate for approval
 */
export function validateForApproval(mandateData, childData = {}) {
  const submissionValidation = validateForSubmission(mandateData, childData)
  
  // Additional requirements for approval
  const approvalErrors = []
  const approvalWarnings = []

  // Must have at least one role
  const rolesResult = validateSection('roles', mandateData, childData)
  approvalErrors.push(...rolesResult.errors)

  // Quality priority should be selected
  if (!mandateData.quality_priority) {
    approvalWarnings.push('Quality priority selection is recommended for approval')
  }

  // Interfaces required if part of programme
  if (mandateData.is_standalone === false) {
    const interfacesResult = validateSection('interfaces', mandateData, childData)
    approvalErrors.push(...interfacesResult.errors)
  }

  return {
    isValid: submissionValidation.isValid && approvalErrors.length === 0,
    errors: [...submissionValidation.errors, ...approvalErrors],
    warnings: [...submissionValidation.warnings, ...approvalWarnings]
  }
}

/**
 * Calculates completion progress for all 12 sections
 */
export function calculateCompletionProgress(mandateData, childData = {}) {
  const sections = {
    purpose: !!mandateData.purpose && mandateData.purpose.length >= 20,
    authority: !!mandateData.authority_responsible && mandateData.authority_responsible.length >= 10,
    background: !!mandateData.background && mandateData.background.length >= 100,
    objectives: !!mandateData.project_objectives && mandateData.project_objectives.length >= 100,
    scope: (childData.deliverables || []).filter(d => d.is_in_scope !== false).length > 0,
    constraints: !!mandateData.constraints && mandateData.constraints.length >= 20,
    interfaces: !!mandateData.interfaces && mandateData.interfaces.length >= 20,
    quality: !!mandateData.quality_priority && !!mandateData.quality_expectations && mandateData.quality_expectations.length >= 20,
    businessCase: !!mandateData.outline_business_case && mandateData.outline_business_case.length >= 100,
    roles: !!(mandateData.proposed_executive_id || mandateData.proposed_executive_name || 
              mandateData.proposed_pm_id || mandateData.proposed_pm_name),
    stakeholders: (childData.stakeholders || []).filter(s => 
      s.stakeholder_type === 'customer' || s.stakeholder_type === 'user'
    ).length > 0,
  }

  const completed = Object.values(sections).filter(Boolean).length
  const total = Object.keys(sections).length
  const percentage = Math.round((completed / total) * 100)

  return {
    percentage,
    completed,
    total,
    sections
  }
}

/**
 * Checks if mandate can be submitted for review
 */
export function canSubmitForReview(mandateData, childData = {}) {
  const validation = validateForSubmission(mandateData, childData)
  return validation.isValid
}

/**
 * Checks if mandate can be approved
 */
export function canApprove(mandateData, childData = {}) {
  const validation = validateForApproval(mandateData, childData)
  return validation.isValid
}

/**
 * Gets validation summary for display
 */
export function getValidationSummary(mandateData, childData = {}) {
  const progress = calculateCompletionProgress(mandateData, childData)
  const draftValidation = validateDraft(mandateData)
  const submissionValidation = validateForSubmission(mandateData, childData)
  const approvalValidation = validateForApproval(mandateData, childData)

  return {
    progress,
    draft: draftValidation,
    submission: submissionValidation,
    approval: approvalValidation,
    canSaveDraft: draftValidation.isValid,
    canSubmit: submissionValidation.isValid,
    canApprove: approvalValidation.isValid
  }
}
