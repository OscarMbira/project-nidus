/**
 * Map runtime JS values ↔ DB columns on custom_field_values / custom_field_group_values.
 */

export function serializeCustomFieldValue(fieldType, value) {
  if (value === undefined || value === null || value === '') {
    return {
      value_text: null,
      value_number: null,
      value_boolean: null,
      value_date: null,
      value_timestamptz: null,
      value_json: null,
    }
  }
  const base = {
    value_text: null,
    value_number: null,
    value_boolean: null,
    value_date: null,
    value_timestamptz: null,
    value_json: null,
  }
  switch (fieldType) {
    case 'number':
      base.value_number = Number(value)
      break
    case 'integer':
      base.value_number = Math.trunc(Number(value))
      break
    case 'boolean':
      base.value_boolean = Boolean(value)
      break
    case 'date':
      base.value_date = typeof value === 'string' ? value.split('T')[0] : value
      break
    case 'datetime':
      base.value_timestamptz = value instanceof Date ? value.toISOString() : String(value)
      break
    case 'multi_select':
    case 'json':
      base.value_json = Array.isArray(value) || typeof value === 'object' ? value : [value]
      break
    default:
      base.value_text = String(value)
  }
  return base
}

export function deserializeCustomFieldValue(fieldType, row) {
  if (!row) return null
  switch (fieldType) {
    case 'number':
    case 'integer':
      return row.value_number != null ? Number(row.value_number) : null
    case 'boolean':
      return row.value_boolean
    case 'date':
      return row.value_date
    case 'datetime':
      return row.value_timestamptz
    case 'multi_select':
    case 'json':
      return row.value_json
    default:
      return row.value_text
  }
}
