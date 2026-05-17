/** Metadata per field_type for labels and editor hints */

export const FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'integer',
  'date',
  'datetime',
  'boolean',
  'url',
  'email',
  'dropdown',
  'multi_select',
  'json',
]

const registry = {
  text: { label: 'Short text', dataType: 'string', multiline: false },
  long_text: { label: 'Long text', dataType: 'string', multiline: true },
  number: { label: 'Number', dataType: 'number', multiline: false },
  integer: { label: 'Whole number', dataType: 'integer', multiline: false },
  date: { label: 'Date', dataType: 'date', multiline: false },
  datetime: { label: 'Date & time', dataType: 'datetime', multiline: false },
  boolean: { label: 'Yes / No', dataType: 'boolean', multiline: false },
  url: { label: 'URL', dataType: 'string', multiline: false },
  email: { label: 'Email', dataType: 'string', multiline: false },
  dropdown: { label: 'Dropdown', dataType: 'string', multiline: false },
  multi_select: { label: 'Multi-select', dataType: 'json', multiline: false },
  json: { label: 'JSON', dataType: 'json', multiline: true },
}

export function getFieldTypeMeta(type) {
  return registry[type] || registry.text
}

export function isOptionBackedType(type) {
  return type === 'dropdown' || type === 'multi_select'
}
