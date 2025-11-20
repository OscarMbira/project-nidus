/**
 * Form Validation Utilities
 * Common validation functions for form fields
 */

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  return null
}

/**
 * Validate required field
 */
export function validateRequired(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate minimum length
 */
export function validateMinLength(value, minLength, fieldName = 'This field') {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  return null
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value, maxLength, fieldName = 'This field') {
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`
  }
  return null
}

/**
 * Validate URL format
 */
export function validateURL(url) {
  if (!url) return null
  try {
    new URL(url)
    return null
  } catch {
    return 'Please enter a valid URL'
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return null
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (end < start) {
    return 'End date must be after start date'
  }
  return null
}

/**
 * Validate number range
 */
export function validateNumberRange(value, min, max, fieldName = 'This field') {
  const num = Number(value)
  if (isNaN(num)) return `${fieldName} must be a number`
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be no more than ${max}`
  }
  return null
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password) return 'Password is required'
  
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const errors = []
  
  if (password.length < minLength) {
    errors.push(`at least ${minLength} characters`)
  }
  if (!hasUpperCase) {
    errors.push('one uppercase letter')
  }
  if (!hasLowerCase) {
    errors.push('one lowercase letter')
  }
  if (!hasNumber) {
    errors.push('one number')
  }
  if (!hasSpecialChar) {
    errors.push('one special character')
  }
  
  if (errors.length > 0) {
    return `Password must contain ${errors.join(', ')}`
  }
  
  return null
}

/**
 * Validate phone number (basic)
 */
export function validatePhone(phone) {
  if (!phone) return null
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
    return 'Please enter a valid phone number'
  }
  return null
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value, fieldName = 'This field') {
  const num = Number(value)
  if (isNaN(num)) return `${fieldName} must be a number`
  if (num <= 0) return `${fieldName} must be greater than 0`
  return null
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value, fieldName = 'This field') {
  return validateNumberRange(value, 0, 100, fieldName)
}

/**
 * Validate slug format (URL-friendly string)
 */
export function validateSlug(slug) {
  if (!slug) return null
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(slug)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens'
  }
  return null
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid) {
  if (!uuid) return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    return 'Please enter a valid UUID'
  }
  return null
}

/**
 * Combine multiple validators
 */
export function validateField(value, validators, fieldName) {
  for (const validator of validators) {
    const error = validator(value, fieldName)
    if (error) return error
  }
  return null
}

/**
 * Create a validator function
 */
export function createValidator(...validators) {
  return (value, fieldName) => {
    return validateField(value, validators, fieldName)
  }
}

