/**
 * Error Handler Utilities
 * Consistent error handling and user feedback
 */

/**
 * Extract user-friendly error message from error object
 */
export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred'
  
  // Error with message property
  if (error.message) {
    return error.message
  }
  
  // Error string
  if (typeof error === 'string') {
    return error
  }
  
  // Supabase error
  if (error.error_description) {
    return error.error_description
  }
  
  if (error.message) {
    return error.message
  }
  
  // Network error
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.'
  }
  
  // Default
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Handle API error and return user-friendly message
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  console.error('API Error:', error)
  
  // Supabase-specific errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return 'This record already exists. Please use a different value.'
      case '23503': // Foreign key violation
        return 'This record cannot be deleted because it is being used elsewhere.'
      case '23502': // Not null violation
        return 'Required fields are missing.'
      case 'PGRST116': // Not found
        return 'The requested record was not found.'
      case 'PGRST301': // JWT expired
        return 'Your session has expired. Please log in again.'
      default:
        return error.message || defaultMessage
    }
  }
  
  return getErrorMessage(error)
}

/**
 * Log error for debugging (development only)
 */
export function logError(error, context = '') {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error, action = 'perform this action') {
  const message = getErrorMessage(error)
  
  // Common error patterns
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return `Unable to ${action}. Please check your internet connection and try again.`
  }
  
  if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('unauthorized')) {
    return `You don't have permission to ${action}. Please contact your administrator.`
  }
  
  if (message.toLowerCase().includes('not found')) {
    return `Unable to ${action}. The requested item was not found.`
  }
  
  return message
}

/**
 * Handle form validation errors
 */
export function handleValidationErrors(errors) {
  const errorMessages = Object.entries(errors)
    .filter(([_, error]) => error)
    .map(([field, error]) => `${field}: ${error}`)
  
  if (errorMessages.length > 0) {
    return errorMessages.join('\n')
  }
  
  return null
}

