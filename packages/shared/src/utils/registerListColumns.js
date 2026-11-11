/**
 * List columns configured on a register (v1381): `register.behaviour.list_columns`.
 *
 *   [{ field: '<field_key>' | 'title' | 'status', label?: string, display?: 'duration' | 'percent' }, …]
 *
 * Optional `warn_when: { field, gt }` highlights a cell when that value is above gt.
 * Labels come from the configuration, else from the field definition's `field_label`, else from the
 * status workflow / register — never from code (rule 25.1). Unknown field keys are dropped.
 */
import { formatMinutes } from './registerDateTime.js'

const CORE = new Set(['title', 'status'])

/** Resolved columns: { key, label, field (definition or null), display, numeric, config }. */
export function resolveListColumns(register) {
  const fields = register?.fields || []
  const byKey = Object.fromEntries(fields.map((f) => [f.field_key, f]))
  const config = Array.isArray(register?.behaviour?.list_columns) ? register.behaviour.list_columns : []
  return config
    .filter((c) => c && (CORE.has(c.field) || byKey[c.field]))
    .map((c) => {
      const field = byKey[c.field] || null
      const display = c.display || field?.calculation?.display || null
      return {
        key: c.field,
        label: c.label ?? field?.field_label ?? '',
        field,
        display,
        numeric: field?.field_type === 'number' || field?.field_type === 'currency',
        config: c,
      }
    })
}

const has = (v) => v !== undefined && v !== null && v !== ''

/**
 * Display text for one cell from the field definition ('' when empty).
 * @param {object} column           from resolveListColumns
 * @param {*} value
 * @param {object} fmt              { formatNumber, formatDateTime, yes, no }
 */
export function formatListCell(column, value, fmt = {}) {
  if (!has(value)) return ''
  const field = column.field
  // `signed: true` (column config) also shows "+" on positive values, e.g. over / under budget.
  const plus = column.config?.signed && Number(value) > 0 ? '+' : ''
  if (column.display === 'duration') return plus + formatMinutes(Number(value))
  if (column.display === 'percent') return `${Number(value).toFixed(field?.calculation?.decimals ?? 2)}%`
  switch (field?.field_type) {
    case 'number':
    case 'currency': {
      const decimals = field?.calculation?.decimals
      if (decimals) return Number(value).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      return fmt.formatNumber ? fmt.formatNumber(value) : String(value)
    }
    case 'datetime':
      return fmt.formatDateTime ? fmt.formatDateTime(value) : String(value)
    case 'boolean':
      return value === true || value === 'true' ? (fmt.yes ?? 'Yes') : (fmt.no ?? 'No')
    case 'dropdown': {
      const opt = (field.dropdown_options || []).find((o) => o.value === value)
      return opt?.label ?? String(value)
    }
    default:
      return Array.isArray(value) ? value.map((v) => v?.label ?? v).join(', ') : String(value)
  }
}
