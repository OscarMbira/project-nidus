/**
 * Client-side validation for custom fields and repeating groups.
 * @param {object} definition — custom_field_definitions row (+ options[])
 * @param {any} value
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateSingleField(definition, value) {
  const errors = []
  const rules = definition?.validation_rules || {}
  const req = rules.required === true
  const empty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

  if (req && empty) {
    errors.push(rules.requiredMessage || `${definition.label || 'Field'} is required`)
    return { ok: false, errors }
  }
  if (empty) return { ok: true, errors }

  const type = definition.field_type
  const str = String(value)

  if (rules.maxLength != null && typeof value === 'string' && value.length > rules.maxLength) {
    errors.push(rules.maxLengthMessage || `Maximum length is ${rules.maxLength}`)
  }
  if (rules.minLength != null && typeof value === 'string' && value.length < rules.minLength) {
    errors.push(rules.minLengthMessage || `Minimum length is ${rules.minLength}`)
  }

  if ((type === 'number' || type === 'integer') && Number.isNaN(Number(value))) {
    errors.push('Must be a valid number')
  }
  if (type === 'integer' && !Number.isInteger(Number(value))) {
    errors.push('Must be a whole number')
  }
  if (rules.min != null && Number(value) < Number(rules.min)) {
    errors.push(rules.minMessage || `Must be at least ${rules.min}`)
  }
  if (rules.max != null && Number(value) > Number(rules.max)) {
    errors.push(rules.maxMessage || `Must be at most ${rules.max}`)
  }

  if (rules.pattern) {
    try {
      const re = new RegExp(rules.pattern)
      if (!re.test(str)) errors.push(rules.patternMessage || 'Format is invalid')
    } catch {
      errors.push('Invalid validation pattern configuration')
    }
  }

  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    errors.push('Invalid email address')
  }

  if (type === 'dropdown' && Array.isArray(definition.options)) {
    const allowed = new Set(definition.options.map((o) => o.option_value))
    if (!allowed.has(str)) errors.push('Must select a valid option')
  }

  if (type === 'multi_select' && Array.isArray(definition.options)) {
    const allowed = new Set(definition.options.map((o) => o.option_value))
    const vals = Array.isArray(value) ? value : [value]
    for (const v of vals) {
      if (!allowed.has(String(v))) {
        errors.push('Invalid multi-select value')
        break
      }
    }
  }

  if (rules.uniquePerEntity && definition.__existingValuesForUnique) {
    const set = definition.__existingValuesForUnique
    const key = type === 'multi_select' ? JSON.stringify(value) : String(value)
    if (set.has(key)) errors.push(rules.uniqueMessage || 'Value must be unique')
  }

  return { ok: errors.length === 0, errors }
}

/**
 * @param {object} groupMeta — { min_rows, max_rows }
 * @param {number} rowCount
 */
export function validateGroupRowBounds(groupMeta, rowCount) {
  const errors = []
  const min = groupMeta?.min_rows ?? 0
  const max = groupMeta?.max_rows ?? 999
  if (rowCount < min) errors.push(`At least ${min} row(s) required`)
  if (rowCount > max) errors.push(`At most ${max} row(s) allowed`)
  return { ok: errors.length === 0, errors }
}
