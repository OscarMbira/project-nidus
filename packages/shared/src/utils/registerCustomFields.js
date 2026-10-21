/**
 * Local Register Engine — organisation custom fields (v1311).
 * Definitions come from Local Data Extensions (account-scoped); values live on the register
 * record's field_values under `cf__<definition id>` so they save with the record (PRD D13).
 * Pure helpers shared by Platform and Simulator.
 */

export const CUSTOM_FIELD_KEY_PREFIX = 'cf__'

/** Types a user can pick when adding a field (PRD D5), in dialog order. */
export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Notes (long text)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'url', label: 'Link (URL)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-select dropdown' },
  { value: 'multi_line', label: 'Multi-value list' },
]

export const OPTION_FIELD_TYPES = ['dropdown', 'multi_select']

// LDE types a PMO admin may create elsewhere, rendered with the nearest register input.
const RENDER_TYPE = { integer: 'number', email: 'text', datetime: 'date', json: 'long_text' }

export function customFieldKey(definitionId) {
  return `${CUSTOM_FIELD_KEY_PREFIX}${definitionId}`
}

export function isCustomFieldKey(key) {
  return typeof key === 'string' && key.startsWith(CUSTOM_FIELD_KEY_PREFIX)
}

export function fieldTypeLabel(type) {
  return CUSTOM_FIELD_TYPES.find((t) => t.value === type)?.label || type
}

/**
 * Turns a custom field returned by the RPCs ({ id, label, field_type, required, options })
 * into the register field shape the form, view, list and export already understand.
 */
export function toRegisterField(definition, registerId) {
  return {
    id: `cf-${definition.id}`,
    definition_id: definition.id,
    register_id: registerId,
    field_key: customFieldKey(definition.id),
    field_label: definition.label,
    field_type: RENDER_TYPE[definition.field_type] || definition.field_type,
    is_required: !!definition.required,
    dropdown_options: (definition.options || []).map((o) => ({ value: o.value, label: o.label })),
    is_custom: true,
  }
}

/** Case, spacing and punctuation-insensitive form of a field name (matches the RPC's check). */
export function normaliseFieldName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function findExactFieldMatch(name, library) {
  const norm = normaliseFieldName(name)
  if (!norm) return null
  return (library || []).find((f) => normaliseFieldName(f.label) === norm) || null
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = temp
    }
  }
  return prev[b.length]
}

const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)

/**
 * Existing fields whose name looks like `name` ("Did you mean …?") — excludes an exact match.
 * Similar = one name contains the other, a small edit distance, or most words shared.
 */
export function findSimilarFields(name, library, max = 3) {
  const norm = normaliseFieldName(name)
  if (norm.length < 3) return []
  const typedWords = words(name)
  return (library || [])
    .filter((f) => {
      const other = normaliseFieldName(f.label)
      if (!other || other === norm) return false
      if (Math.min(other.length, norm.length) >= 4 && (other.includes(norm) || norm.includes(other))) return true
      if (levenshtein(norm, other) <= Math.max(1, Math.floor(Math.max(norm.length, other.length) * 0.25))) return true
      const otherWords = words(f.label)
      const shared = typedWords.filter((w) => otherWords.includes(w)).length
      return shared > 0 && shared >= Math.ceil(Math.max(typedWords.length, otherWords.length) / 2)
    })
    .slice(0, max)
}

/** Friendly text for an RPC error (the limit error carries a machine prefix). */
export function customFieldErrorMessage(error) {
  const message = typeof error === 'string' ? error : error?.message || ''
  if (message.startsWith('CUSTOM_FIELD_LIMIT_REACHED')) {
    const max = message.match(/has (\d+) custom fields/)?.[1]
    return `Your organisation has reached its limit${max ? ` of ${max}` : ''} custom fields for this register. Ask a PMO admin to retire one, or your system administrator to raise the limit.`
  }
  return message || 'Something went wrong. Please try again.'
}

/** Export/print value for any register field (built-in or custom): option labels, Yes/No, one item per line. */
export function registerFieldExportValue(value, field) {
  if (value === null || value === undefined || value === '') return ''
  const labelOf = (v) => (field?.dropdown_options || []).find((o) => o.value === v)?.label || v
  if (Array.isArray(value)) return value.map(labelOf).join('\n')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (field?.field_type === 'dropdown') return labelOf(value)
  return String(value)
}

/** Flat lowercase text of a record's title, ID and field values — used by the list search. */
export function registerRecordSearchText(record) {
  const values = Object.values(record?.field_values || {}).map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
  return [record?.title, record?.display_id, ...values].filter(Boolean).join(' ').toLowerCase()
}
