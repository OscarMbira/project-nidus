export function validateRequiredFields(schema = {}, values = {}) {
  const required = Array.isArray(schema.required) ? schema.required : []
  const errors = {}
  for (const key of required) {
    const value = values[key]
    if (value === undefined || value === null || value === '') {
      errors[key] = 'This field is required'
    }
  }
  return errors
}

export function validateDateOrder(startDate, endDate) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Invalid date'
  if (start > end) return 'Start date cannot be after end date'
  return null
}

export function validateProbabilityImpactScale(probability, impact, maxScale = 5) {
  const p = Number(probability)
  const i = Number(impact)
  if (Number.isNaN(p) || Number.isNaN(i)) return 'Probability and impact must be numeric'
  if (p < 1 || p > maxScale || i < 1 || i > maxScale) {
    return `Probability and impact must be between 1 and ${maxScale}`
  }
  return null
}
