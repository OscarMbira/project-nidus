/**
 * v1337 engine additions: Date & Time fields, calculated fields and record references.
 */
import { describe, it, expect } from 'vitest'
import {
  toDateTimeInputValue, fromDateTimeInputValue, formatRegionalDateTime, minutesBetween, formatMinutes, nowDateTimeValue,
} from '../registerDateTime'
import { applyCalculations, evaluateCalculation, isCalculatedField, formatCalculatedValue } from '../registerCalculations'
import { normaliseRefValue, recordRefLabel, toRefValue, refValueText, refTargetKey, refAllowsMultiple, refShowFields } from '../registerRecordRef'
import { registerFieldExportValue, registerRecordSearchText } from '../registerCustomFields'

const NAIROBI = { time_zone: 'Africa/Nairobi', date_format: 'D MMM YYYY', time_format: '24h', locale: 'en-GB' }
const LONDON = { time_zone: 'Europe/London', date_format: 'YYYY-MM-DD', time_format: '12h' }

describe('Date & Time fields', () => {
  it('stores UTC and shows the organisation time zone', () => {
    const stored = fromDateTimeInputValue('2027-04-10T18:05', NAIROBI) // UTC+3
    expect(stored).toBe('2027-04-10T15:05:00.000Z')
    expect(toDateTimeInputValue(stored, NAIROBI)).toBe('2027-04-10T18:05')
    expect(formatRegionalDateTime(stored, NAIROBI)).toBe('10 Apr 2027 18:05')
  })

  it('respects daylight saving and 12-hour time', () => {
    const summer = fromDateTimeInputValue('2027-07-01T09:30', LONDON) // BST, UTC+1
    expect(summer).toBe('2027-07-01T08:30:00.000Z')
    const winter = fromDateTimeInputValue('2027-01-15T21:00', LONDON) // GMT
    expect(winter).toBe('2027-01-15T21:00:00.000Z')
    expect(formatRegionalDateTime(winter, LONDON)).toBe('2027-01-15 9:00 PM')
  })

  it('handles empty and invalid values, and stamps now in whole minutes', () => {
    expect(fromDateTimeInputValue('', NAIROBI)).toBe('')
    expect(toDateTimeInputValue('not a date', NAIROBI)).toBe('')
    expect(nowDateTimeValue(new Date('2027-04-10T15:05:42.123Z'))).toBe('2027-04-10T15:05:00.000Z')
  })

  it('works out durations', () => {
    expect(minutesBetween('2027-04-10T15:05:00Z', '2027-04-10T17:12:00Z')).toBe(127)
    expect(minutesBetween('2027-04-10T17:00:00Z', '2027-04-10T15:00:00Z')).toBeNull()
    expect(minutesBetween('', '2027-04-10T15:00:00Z')).toBeNull()
    expect(formatMinutes(127)).toBe('2h 07m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(-7)).toBe('-7m')
  })
})

describe('Calculated fields', () => {
  const fields = [
    { field_key: 'received', field_type: 'number' },
    { field_key: 'loaded', field_type: 'number' },
    { field_key: 'start_at', field_type: 'datetime' },
    { field_key: 'end_at', field_type: 'datetime' },
    { field_key: 'budget_minutes', field_type: 'number' },
    { field_key: 'failed', field_type: 'number', calculation: { op: 'difference', minuend: 'received', subtrahend: 'loaded' } },
    { field_key: 'success_percent', field_type: 'number', calculation: { op: 'percent', numerator: 'loaded', denominator: 'received', decimals: 4, display: 'percent' } },
    { field_key: 'time_taken_minutes', field_type: 'number', calculation: { op: 'minutes_between', start: 'start_at', end: 'end_at', display: 'duration' } },
    { field_key: 'throughput_per_second', field_type: 'number', calculation: { op: 'per_second', count: 'loaded', start: 'start_at', end: 'end_at' } },
    { field_key: 'budget_variance_minutes', field_type: 'number', calculation: { op: 'difference', minuend: 'time_taken_minutes', subtrahend: 'budget_minutes', display: 'duration' } },
  ]

  it('works out every rule in field order, including one built on another', () => {
    const out = applyCalculations(fields, {
      received: 6816033, loaded: 6816021, start_at: '2027-04-10T15:05:00Z', end_at: '2027-04-10T17:12:00Z', budget_minutes: 120,
    })
    expect(out.failed).toBe(12)
    expect(out.success_percent).toBe(99.9998)
    expect(out.time_taken_minutes).toBe(127)
    expect(out.throughput_per_second).toBe(894.5)
    expect(out.budget_variance_minutes).toBe(7)
  })

  it('removes a stale value when an input is missing, and never divides by zero', () => {
    const out = applyCalculations(fields, { received: 0, loaded: 0, failed: 99, time_taken_minutes: 50 })
    expect(out.failed).toBe(0)
    expect(out).not.toHaveProperty('success_percent')
    expect(out).not.toHaveProperty('time_taken_minutes')
    expect(evaluateCalculation({ op: 'unknown' }, {})).toBeNull()
  })

  it('formats durations and percentages for display', () => {
    expect(isCalculatedField(fields[5])).toBe(true)
    expect(isCalculatedField(fields[0])).toBe(false)
    expect(formatCalculatedValue(fields[7], 127)).toBe('2h 07m')
    expect(formatCalculatedValue(fields[6], 99.5)).toBe('99.5%')
    expect(registerFieldExportValue(127, fields[7], null)).toBe('2h 07m')
  })
})

describe('Record references', () => {
  const field = { field_type: 'record_ref', dropdown_options: [{ value: 'fin_data_mapping', label: 'Data Mapping', multiple: true, show_fields: ['expected_record_count'] }] }

  it('reads the field definition', () => {
    expect(refTargetKey(field)).toBe('fin_data_mapping')
    expect(refAllowsMultiple(field)).toBe(true)
    expect(refShowFields(field)).toEqual(['expected_record_count'])
  })

  it('stores id + label and reads older shapes', () => {
    const value = toRefValue([{ id: 'a', display_id: 'LREG-2026-301', title: 'Customer mapping sheet' }, { id: 'b', title: 'No ID yet' }])
    expect(value).toEqual([{ id: 'a', label: 'LREG-2026-301 – Customer mapping sheet' }, { id: 'b', label: 'No ID yet' }])
    expect(normaliseRefValue('x')).toEqual([{ id: 'x', label: 'x' }])
    expect(normaliseRefValue(null)).toEqual([])
    expect(recordRefLabel({ title: 'T' })).toBe('T')
    expect(refValueText(value)).toBe('LREG-2026-301 – Customer mapping sheet\nNo ID yet')
  })

  it('shows labels in exports and finds them in the list search', () => {
    const value = [{ id: 'a', label: 'LREG-2026-301 – Customer mapping sheet' }]
    expect(registerFieldExportValue(value, field, null)).toBe('LREG-2026-301 – Customer mapping sheet')
    expect(registerRecordSearchText({ title: 'Step 1', field_values: { mapping_sheet: value } })).toContain('customer mapping sheet')
  })
})
