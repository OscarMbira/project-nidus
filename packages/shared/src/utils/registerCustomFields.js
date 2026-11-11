/**
 * Local Register Engine — organisation custom fields (v1311).
 * Definitions come from Local Data Extensions (account-scoped); values live on the register
 * record's field_values under `cf__<definition id>` so they save with the record (PRD D13).
 * Pure helpers shared by Platform and Simulator.
 */
import { tableValueLines } from './registerTableField'
import { formatRegionalCurrency, formatRegionalNumber } from './formatRegionalSettings.js'
import { formatRegionalDateTime } from './registerDateTime.js'
import { formatCalculatedValue } from './registerCalculations.js'
import { refValueText } from './registerRecordRef.js'

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
    rules: definition.rules || {},
    is_custom: true,
  }
}

// ── Optional field settings (v1314): default value, ranges, allowed characters ─────────

/** Allowed-characters choices; patterns mirror public.lr_cf_build_rules (the server builds the real one). */
export const ALLOWED_CHARACTER_OPTIONS = [
  { value: 'any', label: 'Any characters' },
  { value: 'letters', label: 'Letters and spaces only' },
  { value: 'digits', label: 'Digits only' },
  { value: 'alphanumeric', label: 'Letters, digits and spaces only' },
  { value: 'reference', label: 'Reference code (letters, digits and . _ / -)' },
  { value: 'custom', label: 'Only characters I list' },
]

/** Which optional settings a field type offers in the add-field panel. */
export function customFieldSettingsFor(type) {
  return {
    length: ['text', 'long_text', 'url', 'multi_line'].includes(type),
    characters: ['text', 'long_text', 'multi_line'].includes(type),
    numberRange: type === 'number',
    dateRange: type === 'date',
    itemCount: ['multi_line', 'multi_select'].includes(type),
    defaultValue: true,
  }
}

const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== ''

/**
 * Checks the optional settings typed in the add-field panel (same rules the server enforces),
 * so the user sees problems before pressing Create. Returns a list of messages.
 */
export function customFieldSettingsErrors(type, settings = {}, options = []) {
  const s = settings || {}
  const errors = []
  const num = (v) => (hasValue(v) ? Number(v) : null)
  const isWhole = (v) => !hasValue(v) || (Number.isInteger(Number(v)) && Number(v) >= 0)
  const range = (minKey, maxKey, label) => {
    const lo = num(s[minKey])
    const hi = num(s[maxKey])
    if (lo !== null && hi !== null && lo > hi) errors.push(`Minimum ${label} cannot be greater than the maximum`)
  }
  const apply = customFieldSettingsFor(type)
  if (apply.length) {
    if (!isWhole(s.minLength) || !isWhole(s.maxLength)) errors.push('Lengths must be whole numbers')
    range('minLength', 'maxLength', 'length')
  }
  if (apply.itemCount) {
    if (!isWhole(s.minItems) || !isWhole(s.maxItems)) errors.push('Numbers of items must be whole numbers')
    range('minItems', 'maxItems', 'number of items')
  }
  if (apply.numberRange) {
    if ([s.min, s.max, s.defaultValue].some((v) => hasValue(v) && Number.isNaN(Number(v)))) errors.push('Minimum, maximum and default must be numbers')
    range('min', 'max', 'value')
    const d = num(s.defaultValue)
    if (d !== null && ((num(s.min) !== null && d < num(s.min)) || (num(s.max) !== null && d > num(s.max)))) {
      errors.push('The default value must be within the minimum and maximum')
    }
  }
  if (apply.dateRange) {
    if (hasValue(s.minDate) && hasValue(s.maxDate) && s.minDate > s.maxDate) errors.push('The earliest date cannot be after the latest date')
    const d = s.defaultValue
    if (hasValue(d) && d !== 'today' && ((hasValue(s.minDate) && d < s.minDate) || (hasValue(s.maxDate) && d > s.maxDate))) {
      errors.push('The default date must be within the earliest and latest dates')
    }
  }
  if (apply.characters && s.allowedCharacters === 'custom' && !hasValue(s.allowedCharactersCustom)) {
    errors.push('List the characters that are allowed')
  }
  if (type === 'dropdown' && hasValue(s.defaultValue) && !options.includes(s.defaultValue)) {
    errors.push('The default value must be one of the options')
  }
  if (type === 'multi_select' && Array.isArray(s.defaultValue) && s.defaultValue.some((d) => !options.includes(d))) {
    errors.push('Default values must be among the options')
  }
  return errors
}

function isoToday(today) {
  const d = today || new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Default value for a new record, or undefined when the field has none ('today' → today's date). */
export function customFieldDefaultValue(field, today) {
  const d = field?.rules?.defaultValue
  if (d === undefined || d === null || d === '') return undefined
  if (field.field_type === 'date' && d === 'today') return isoToday(today)
  return d
}

function safePattern(pattern) {
  try {
    return pattern ? new RegExp(pattern) : null
  } catch {
    return null
  }
}

/**
 * Problems with a custom field value against its rules (empty values are left to the Required
 * check). Returns a list of plain-language messages.
 */
export function validateRegisterCustomValue(field, value) {
  const r = field?.rules || {}
  const type = field?.field_type
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return []
  const errors = []
  const re = safePattern(r.pattern)
  const checkText = (text, prefix = '') => {
    if (r.minLength != null && text.length < r.minLength) errors.push(`${prefix}Must be at least ${r.minLength} characters`)
    if (r.maxLength != null && text.length > r.maxLength) errors.push(`${prefix}Must be at most ${r.maxLength} characters`)
    if (re && !re.test(text)) errors.push(`${prefix}${r.patternMessage || 'Contains characters that are not allowed'}`)
  }
  if (['text', 'long_text', 'url'].includes(type)) checkText(String(value))
  if (type === 'number') {
    const n = Number(value)
    if (Number.isNaN(n)) errors.push('Must be a number')
    else {
      if (r.min != null && n < Number(r.min)) errors.push(`Must be at least ${r.min}`)
      if (r.max != null && n > Number(r.max)) errors.push(`Must be at most ${r.max}`)
    }
  }
  if (type === 'date') {
    if (r.minDate && value < r.minDate) errors.push(`Must be on or after ${r.minDate}`)
    if (r.maxDate && value > r.maxDate) errors.push(`Must be on or before ${r.maxDate}`)
  }
  if (type === 'multi_line' || type === 'multi_select') {
    const items = Array.isArray(value) ? value : String(value).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (r.minItems != null && items.length < r.minItems) errors.push(`Needs at least ${r.minItems} item${r.minItems === 1 ? '' : 's'}`)
    if (r.maxItems != null && items.length > r.maxItems) errors.push(`Allows at most ${r.maxItems} item${r.maxItems === 1 ? '' : 's'}`)
    if (type === 'multi_line') items.forEach((item, i) => checkText(item, `Item ${i + 1}: `))
  }
  return [...new Set(errors)]
}

/** Short hint shown under a custom field input, e.g. "2–20 characters · Digits only". */
export function customFieldHint(field) {
  const r = field?.rules || {}
  const parts = []
  const span = (lo, hi, unit) => {
    if (lo != null && hi != null) return `${lo}–${hi} ${unit}`
    if (lo != null) return `At least ${lo} ${unit}`
    if (hi != null) return `Up to ${hi} ${unit}`
    return null
  }
  const lengthText = span(r.minLength, r.maxLength, 'characters')
  if (lengthText) parts.push(field.field_type === 'multi_line' ? `${lengthText} per item` : lengthText)
  if (r.min != null || r.max != null) parts.push(r.min != null && r.max != null ? `Between ${r.min} and ${r.max}` : r.min != null ? `At least ${r.min}` : `At most ${r.max}`)
  if (r.minDate || r.maxDate) parts.push(r.minDate && r.maxDate ? `${r.minDate} to ${r.maxDate}` : r.minDate ? `From ${r.minDate}` : `Until ${r.maxDate}`)
  const itemsText = span(r.minItems, r.maxItems, 'items')
  if (itemsText) parts.push(itemsText)
  if (r.pattern && r.patternMessage) parts.push(r.patternMessage)
  return parts.join(' · ')
}

/** Case, spacing and punctuation-insensitive form of a field name (matches the RPC's check). */
export function normaliseFieldName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Existing field whose label or field name matches `name` (field names drop the internal "lr_" prefix). */
export function findExactFieldMatch(name, library) {
  const norm = normaliseFieldName(name)
  if (!norm) return null
  return (
    (library || []).find((f) =>
      [f.label, String(f.name || '').replace(/^lr_/, '')].some((n) => n && normaliseFieldName(n) === norm)
    ) || null
  )
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
/**
 * Amount / number text in the organisation's regional format (rule 68), or null when the field
 * is not an amount or number (or the value is not numeric). Currency uses the resolved currency,
 * decimals and grouping; plain numbers keep their own decimals (70 stays "70").
 */
export function formatRegisterAmount(value, field, settings) {
  const type = field?.field_type
  if (type !== 'currency' && type !== 'number') return null
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  if (type === 'currency') return formatRegionalCurrency(n, settings)
  const decimals = Math.min((String(value).split('.')[1] || '').length, 6)
  return formatRegionalNumber(n, { ...(settings || {}), decimal_places: decimals })
}

export function registerFieldExportValue(value, field, settings) {
  if (value === null || value === undefined || value === '') return ''
  // Table fields (v1326): one readable line per row, cells joined with " – ".
  if (field?.field_type === 'table') return tableValueLines(value, field).join('\n')
  // v1337: date & time in the organisation's zone / format, record references by label,
  // calculated durations / percentages in their display form.
  if (field?.field_type === 'datetime') return formatRegionalDateTime(value, settings)
  if (field?.field_type === 'record_ref') return refValueText(value)
  const calculated = formatCalculatedValue(field, value)
  if (calculated) return calculated
  const amount = formatRegisterAmount(value, field, settings)
  if (amount !== null) return amount
  const labelOf = (v) => (field?.dropdown_options || []).find((o) => o.value === v)?.label || v
  if (Array.isArray(value)) return value.map(labelOf).join('\n')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (field?.field_type === 'dropdown') return labelOf(value)
  return String(value)
}

/** Flat lowercase text of a record's title, ID and field values — used by the list search. */
export function registerRecordSearchText(record) {
  const text = (v) => (v && typeof v === 'object' ? String(v.label ?? '') : String(v ?? ''))
  const values = Object.values(record?.field_values || {}).map((v) => (Array.isArray(v) ? v.map(text).join(' ') : text(v)))
  return [record?.title, record?.display_id, ...values].filter(Boolean).join(' ').toLowerCase()
}
