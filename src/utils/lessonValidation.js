/**
 * Lesson Validation Utilities
 * Comprehensive validation rules for Lessons Log
 */

/**
 * Validate lesson title
 */
export function validateTitle(title) {
  if (!title || title.trim() === '') {
    return { valid: false, error: 'Title is required' };
  }

  if (title.trim().length < 10) {
    return { valid: false, error: 'Title must be at least 10 characters' };
  }

  return { valid: true };
}

/**
 * Validate event description
 */
export function validateEventDescription(eventDescription) {
  if (!eventDescription || eventDescription.trim() === '') {
    return { valid: false, error: 'Event description is required' };
  }

  if (eventDescription.trim().length < 50) {
    return { valid: false, error: 'Event description must be at least 50 characters' };
  }

  return { valid: true };
}

/**
 * Validate effect description
 */
export function validateEffectDescription(effectDescription) {
  if (!effectDescription || effectDescription.trim() === '') {
    return { valid: false, error: 'Effect description is required' };
  }

  if (effectDescription.trim().length < 30) {
    return { valid: false, error: 'Effect description must be at least 30 characters' };
  }

  return { valid: true };
}

/**
 * Validate recommendations
 */
export function validateRecommendations(recommendations) {
  if (!recommendations || recommendations.trim() === '') {
    return { valid: false, error: 'Recommendations are required' };
  }

  if (recommendations.trim().length < 50) {
    return { valid: false, error: 'Recommendations must be at least 50 characters' };
  }

  return { valid: true };
}

/**
 * Validate lesson scope
 */
export function validateScope(scope) {
  const validScopes = ['project', 'corporate', 'programme', 'both_project_corporate', 'both_project_programme'];
  
  if (!scope) {
    return { valid: false, error: 'Lesson scope is required' };
  }

  if (!validScopes.includes(scope)) {
    return { valid: false, error: 'Invalid lesson scope' };
  }

  return { valid: true };
}

/**
 * Validate category
 */
export function validateCategory(category) {
  const validCategories = [
    'process', 'technical', 'resource', 'communication', 'stakeholder',
    'quality', 'schedule', 'cost', 'risk', 'procurement', 'other'
  ];

  if (!category) {
    return { valid: false, error: 'Category is required' };
  }

  if (!validCategories.includes(category)) {
    return { valid: false, error: 'Invalid category' };
  }

  return { valid: true };
}

/**
 * Validate priority
 */
export function validatePriority(priority) {
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  if (!priority) {
    return { valid: false, error: 'Priority is required' };
  }

  if (!validPriorities.includes(priority)) {
    return { valid: false, error: 'Invalid priority' };
  }

  return { valid: true };
}

/**
 * Validate complete lesson
 */
export function validateLesson(lessonData) {
  const errors = {};

  const titleValidation = validateTitle(lessonData.title || lessonData.lesson_title);
  if (!titleValidation.valid) {
    errors.title = titleValidation.error;
  }

  const eventValidation = validateEventDescription(lessonData.event_description || lessonData.what_happened);
  if (!eventValidation.valid) {
    errors.event_description = eventValidation.error;
  }

  const effectValidation = validateEffectDescription(lessonData.effect_description || lessonData.what_was_impact);
  if (!effectValidation.valid) {
    errors.effect_description = effectValidation.error;
  }

  const recommendationsValidation = validateRecommendations(lessonData.recommendations);
  if (!recommendationsValidation.valid) {
    errors.recommendations = recommendationsValidation.error;
  }

  const scopeValidation = validateScope(lessonData.lesson_scope);
  if (!scopeValidation.valid) {
    errors.lesson_scope = scopeValidation.error;
  }

  const categoryValidation = validateCategory(lessonData.lesson_category || lessonData.category);
  if (!categoryValidation.valid) {
    errors.category = categoryValidation.error;
  }

  const priorityValidation = validatePriority(lessonData.priority);
  if (!priorityValidation.valid) {
    errors.priority = priorityValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Get validation warnings for a lesson
 */
export function getValidationWarnings(lessonData) {
  const warnings = [];

  // Negative lessons without root cause
  if (lessonData.effect_type === 'negative' && (!lessonData.cause_description || lessonData.cause_description.trim() === '')) {
    warnings.push({
      type: 'missing_cause',
      message: 'Negative lesson is missing root cause analysis - consider adding for completeness',
      severity: 'medium'
    });
  }

  // High priority without recommendations
  if ((lessonData.priority === 'high' || lessonData.priority === 'critical') && 
      (!lessonData.recommendations || lessonData.recommendations.trim().length < 50)) {
    warnings.push({
      type: 'missing_recommendations',
      message: 'High priority lesson without detailed recommendations',
      severity: 'high'
    });
  }

  // Corporate scope without applicability context
  if ((lessonData.lesson_scope === 'corporate' || 
       lessonData.lesson_scope === 'both_project_corporate' ||
       lessonData.lesson_scope === 'both_project_programme') &&
      !lessonData.is_corporate_lesson) {
    warnings.push({
      type: 'corporate_context',
      message: 'Consider promoting this lesson to corporate repository for organizational learning',
      severity: 'low'
    });
  }

  // Lessons without product reference where applicable
  if (!lessonData.related_product_id && !lessonData.related_product_name) {
    warnings.push({
      type: 'missing_product',
      message: 'Consider linking this lesson to a specific product for better traceability',
      severity: 'low'
    });
  }

  return warnings;
}

/**
 * Validate quality criteria for lessons log
 */
export function validateQualityCriteria(logData, lessons = []) {
  const criteria = {
    status_indicates_action: {
      pass: true,
      notes: '',
      details: {}
    },
    lessons_uniquely_identified: {
      pass: true,
      notes: '',
      details: {}
    },
    product_reference_included: {
      pass: true,
      notes: '',
      details: {}
    },
    update_process_defined: {
      pass: logData.update_process && logData.update_process.trim() !== '',
      notes: logData.update_process ? 'Update process defined' : 'Update process not defined',
      details: {}
    },
    access_controlled: {
      pass: logData.access_control_notes && logData.access_control_notes.trim() !== '',
      notes: logData.access_control_notes ? 'Access control documented' : 'Access control not documented',
      details: {}
    }
  };

  // Check status distribution
  const statusCounts = {};
  lessons.forEach(lesson => {
    statusCounts[lesson.status] = (statusCounts[lesson.status] || 0) + 1;
  });

  const meaningfulStatuses = lessons.filter(l => 
    l.status !== 'logged' || (l.status === 'logged' && new Date(l.date_logged || l.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );

  criteria.status_indicates_action.pass = meaningfulStatuses.length > lessons.length * 0.7;
  criteria.status_indicates_action.notes = `${Object.keys(statusCounts).length} different statuses used`;
  criteria.status_indicates_action.details = statusCounts;

  // Check unique identification
  const references = lessons.map(l => l.lesson_reference).filter(Boolean);
  const uniqueReferences = new Set(references);
  criteria.lessons_uniquely_identified.pass = references.length === uniqueReferences.size;
  criteria.lessons_uniquely_identified.notes = `${uniqueReferences.size} of ${references.length} lessons have unique references`;
  criteria.lessons_uniquely_identified.details = {
    total: references.length,
    unique: uniqueReferences.size
  };

  // Check product references
  const withProducts = lessons.filter(l => l.related_product_id || l.related_product_name);
  criteria.product_reference_included.pass = withProducts.length > lessons.length * 0.5;
  criteria.product_reference_included.notes = `${withProducts.length} of ${lessons.length} lessons linked to products (${Math.round((withProducts.length / lessons.length) * 100)}%)`;
  criteria.product_reference_included.details = {
    with_product: withProducts.length,
    without_product: lessons.length - withProducts.length,
    percentage: lessons.length > 0 ? Math.round((withProducts.length / lessons.length) * 100) : 0
  };

  return criteria;
}

/**
 * Get completeness score for a lesson
 */
export function getLessonCompleteness(lessonData) {
  const fields = [
    { key: 'title', weight: 1 },
    { key: 'event_description', altKey: 'what_happened', weight: 2 },
    { key: 'effect_description', altKey: 'what_was_impact', weight: 2 },
    { key: 'cause_description', altKey: 'what_caused_this', weight: 1 },
    { key: 'recommendations', weight: 2 },
    { key: 'lesson_scope', weight: 1 },
    { key: 'category', altKey: 'lesson_category', weight: 1 },
    { key: 'priority', weight: 1 },
    { key: 'effect_type', weight: 1 }
  ];

  let totalWeight = 0;
  let completedWeight = 0;

  fields.forEach(field => {
    const value = lessonData[field.key] || lessonData[field.altKey];
    totalWeight += field.weight;
    if (value && (typeof value === 'string' ? value.trim() !== '' : true)) {
      completedWeight += field.weight;
    }
  });

  return {
    percentage: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
    completed: completedWeight,
    total: totalWeight
  };
}

export default {
  validateTitle,
  validateEventDescription,
  validateEffectDescription,
  validateRecommendations,
  validateScope,
  validateCategory,
  validatePriority,
  validateLesson,
  getValidationWarnings,
  validateQualityCriteria,
  getLessonCompleteness
};
