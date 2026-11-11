/**
 * Calculated Local Register fields (v1337). A field with `calculation` (local_register_fields.calculation,
 * JSONB) is read-only in the form; its value is worked out from other fields of the same record and
 * stored when the record is saved, so lists, exports and documents show it like any other value.
 *
 * Rules (field keys refer to the same record):
 *   { op: 'difference',      minuend, subtrahend, decimals? (default 6) } → minuend − subtrahend
 *   { op: 'percent',         numerator, denominator, decimals? (default 2) } → numerator ÷ denominator × 100
 *   { op: 'minutes_between', start, end }                  → whole minutes between two Date & Time fields
 *   { op: 'per_second',      count, start, end, decimals? (default 1) } → count ÷ seconds between start and end
 *   { op: 'average',         fields: [...], of?, decimals? (default 2) } → mean of the fields that have a number;
 *                            with `of` (e.g. 5 for a 1–5 scale) the mean as a % of that maximum (v1339)
 * Optional `display`: 'duration' (minutes shown as "2h 07m") or 'percent' (shown with "%").
 * Rules run in field order, so a later rule can use an earlier result (e.g. budget variance from the
 * time taken). When an input is missing the calculated value is removed rather than left stale.
 */
import { minutesBetween, formatMinutes } from './registerDateTime.js'

const num = (v) => (v === null || v === undefined || v === '' || typeof v === 'boolean' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
const round = (n, decimals) => Math.round(n * 10 ** decimals) / 10 ** decimals

/** True when the field is worked out by the system. */
export function isCalculatedField(field) {
  return Boolean(field?.calculation && field.calculation.op)
}

/** One rule against a record's values → number, or null when it cannot be worked out. */
export function evaluateCalculation(calculation, values) {
  const v = values || {}
  switch (calculation?.op) {
    case 'difference': {
      const a = num(v[calculation.minuend])
      const b = num(v[calculation.subtrahend])
      // Rounded (default 6 places) so 3.4 − 4 is −0.6, not −0.6000000000000001 (v1339).
      return a === null || b === null ? null : round(a - b, calculation.decimals ?? 6)
    }
    case 'percent': {
      const a = num(v[calculation.numerator])
      const b = num(v[calculation.denominator])
      return a === null || b === null || b === 0 ? null : round((a / b) * 100, calculation.decimals ?? 2)
    }
    case 'average': {
      // v1339: mean of the listed fields that have a number; with `of`, as a % of that maximum.
      const values = (Array.isArray(calculation.fields) ? calculation.fields : []).map((k) => num(v[k])).filter((n) => n !== null)
      if (!values.length) return null
      const mean = values.reduce((t, n) => t + n, 0) / values.length
      const of = num(calculation.of)
      return round(of ? (mean / of) * 100 : mean, calculation.decimals ?? 2)
    }
    case 'minutes_between':
      return minutesBetween(v[calculation.start], v[calculation.end])
    case 'per_second': {
      const count = num(v[calculation.count])
      const minutes = minutesBetween(v[calculation.start], v[calculation.end])
      return count === null || !minutes ? null : round(count / (minutes * 60), calculation.decimals ?? 1)
    }
    default:
      return null
  }
}

/** Values with every calculated field worked out (in field order). */
export function applyCalculations(fields, values) {
  const out = { ...(values || {}) }
  for (const field of fields || []) {
    if (!isCalculatedField(field)) continue
    const result = evaluateCalculation(field.calculation, out)
    if (result === null) delete out[field.field_key]
    else out[field.field_key] = result
  }
  return out
}

/** Display text for a calculated value ('' when none), honouring `display`. */
export function formatCalculatedValue(field, value) {
  if (value === null || value === undefined || value === '') return ''
  const display = field?.calculation?.display
  if (display === 'duration') return formatMinutes(value)
  if (display === 'percent') return `${value}%`
  return null
}
