/**
 * Issue Report Validation Utilities
 * Comprehensive validation rules for Issue Reports
 */

/**
 * Validate report reference format
 */
export function validateReportReference(reference) {
  if (!reference || reference.trim() === '') {
    return { valid: false, error: 'Report reference is required' };
  }

  // Format: ISR-PROJ001-ISS-001
  const pattern = /^ISR-[A-Z0-9]+-[A-Z0-9]+(-[0-9]+)?$/;
  if (!pattern.test(reference)) {
    return { valid: false, error: 'Report reference must follow format: ISR-PROJ001-ISS-001' };
  }

  return { valid: true };
}

/**
 * Validate version number format
 */
export function validateVersionNumber(version) {
  if (!version || version.trim() === '') {
    return { valid: false, error: 'Version number is required' };
  }

  // Format: 1.0, 1.1, 2.0, etc.
  const pattern = /^\d+\.\d+$/;
  if (!pattern.test(version)) {
    return { valid: false, error: 'Version must be in format: X.Y (e.g., 1.0, 1.1)' };
  }

  return { valid: true };
}

/**
 * Validate report date
 */
export function validateReportDate(date) {
  if (!date) {
    return { valid: false, error: 'Report date is required' };
  }

  const reportDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (isNaN(reportDate.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (reportDate > today) {
    return { valid: false, error: 'Report date cannot be in the future' };
  }

  return { valid: true };
}

/**
 * Validate document information section
 */
export function validateDocumentInfo(formData) {
  const errors = {};

  const refValidation = validateReportReference(formData.report_reference);
  if (!refValidation.valid) {
    errors.report_reference = refValidation.error;
  }

  const versionValidation = validateVersionNumber(formData.version_no);
  if (!versionValidation.valid) {
    errors.version_no = versionValidation.error;
  }

  const dateValidation = validateReportDate(formData.report_date);
  if (!dateValidation.valid) {
    errors.report_date = dateValidation.error;
  }

  if (!formData.author_id && (!formData.author_name || formData.author_name.trim() === '')) {
    errors.author = 'Author is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate issue summary section
 */
export function validateIssueSummary(formData) {
  const errors = {};

  if (!formData.issue_title || formData.issue_title.trim() === '') {
    errors.issue_title = 'Issue title is required';
  }

  if (!formData.issue_description || formData.issue_description.trim() === '') {
    errors.issue_description = 'Issue description is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate impact analysis section
 */
export function validateImpactAnalysis(formData) {
  const errors = {};

  const affectsTolerances = formData.affects_stage_tolerances || formData.affects_project_tolerances;

  if (affectsTolerances) {
    // If affects tolerances, at least one impact must be documented
    const hasImpact = !!(
      formData.impact_time ||
      formData.impact_cost ||
      formData.impact_quality ||
      formData.impact_scope ||
      formData.impact_benefits ||
      formData.impact_risk
    );

    if (!hasImpact) {
      errors.impact = 'At least one impact variable must be documented when affecting tolerances';
    }

    if (!formData.tolerance_impact_details || formData.tolerance_impact_details.trim() === '') {
      errors.tolerance_impact_details = 'Tolerance impact details are required when affecting tolerances';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate options section
 */
export function validateOptions(formData, options = []) {
  const errors = {};

  if (formData.decision_required) {
    if (options.length === 0) {
      errors.options = 'At least one option is required when decision is required';
    }

    if (!formData.recommendation || formData.recommendation.trim() === '') {
      errors.recommendation = 'Recommendation is required when decision is required';
    }

    const hasRecommended = options.some(opt => opt.is_recommended);
    if (!hasRecommended && options.length > 0) {
      errors.recommended_option = 'One option must be marked as recommended';
    }
  }

  // Validate individual options
  options.forEach((option, index) => {
    if (!option.option_title || option.option_title.trim() === '') {
      errors[`option_${index}_title`] = `Option ${index + 1} title is required`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate decision section
 */
export function validateDecision(formData) {
  const errors = {};

  if (formData.decision_required) {
    if (!formData.decision_by || formData.decision_by.trim() === '') {
      errors.decision_by = 'Decision by is required when decision is required';
    }

    // If report is being closed, decision must be made
    if (formData.report_status === 'closed') {
      if (!formData.decision_made || formData.decision_made.trim() === '') {
        errors.decision_made = 'Decision made is required when closing report';
      }

      if (!formData.decision_date) {
        errors.decision_date = 'Decision date is required when closing report';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate closure section
 */
export function validateClosure(formData) {
  const errors = {};

  if (formData.report_status === 'closed') {
    if (!formData.closure_date) {
      errors.closure_date = 'Closure date is required when closing report';
    }

    if (!formData.closure_outcome || formData.closure_outcome.trim() === '') {
      errors.closure_outcome = 'Closure outcome is required when closing report';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate entire report for submission
 */
export function validateReportForSubmission(formData, options = []) {
  const allErrors = {};
  
  const docInfo = validateDocumentInfo(formData);
  if (!docInfo.valid) {
    Object.assign(allErrors, docInfo.errors);
  }

  const issueSummary = validateIssueSummary(formData);
  if (!issueSummary.valid) {
    Object.assign(allErrors, issueSummary.errors);
  }

  const impactAnalysis = validateImpactAnalysis(formData);
  if (!impactAnalysis.valid) {
    Object.assign(allErrors, impactAnalysis.errors);
  }

  const optionsValidation = validateOptions(formData, options);
  if (!optionsValidation.valid) {
    Object.assign(allErrors, optionsValidation.errors);
  }

  const decision = validateDecision(formData);
  if (!decision.valid) {
    Object.assign(allErrors, decision.errors);
  }

  return {
    valid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    sections: {
      documentInfo: docInfo.valid,
      issueSummary: issueSummary.valid,
      impactAnalysis: impactAnalysis.valid,
      options: optionsValidation.valid,
      decision: decision.valid
    }
  };
}

/**
 * Get validation summary for display
 */
export function getValidationSummary(validation) {
  const totalSections = Object.keys(validation.sections || {}).length;
  const validSections = Object.values(validation.sections || {}).filter(v => v === true).length;
  const percentage = totalSections > 0 ? Math.round((validSections / totalSections) * 100) : 0;

  return {
    totalSections,
    validSections,
    invalidSections: totalSections - validSections,
    percentage,
    isReadyForSubmission: validation.valid
  };
}

export default {
  validateReportReference,
  validateVersionNumber,
  validateReportDate,
  validateDocumentInfo,
  validateIssueSummary,
  validateImpactAnalysis,
  validateOptions,
  validateDecision,
  validateClosure,
  validateReportForSubmission,
  getValidationSummary
};
