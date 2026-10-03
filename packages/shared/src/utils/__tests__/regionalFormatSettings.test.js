import { describe, it, expect } from 'vitest'
import {
  resolveRegionalFormatSettings,
  buildProjectOverridePayload,
  resolveLocalFieldValues,
  buildLocalFieldProjectPayload,
  parseLocalFieldDefault,
  slugifyLocalFieldKey,
} from '../resolveRegionalFormatSettings.js'
import { formatRegionalCurrency, formatRegionalNumber, formatRegionalDate } from '../formatRegionalSettings.js'
import { REGIONAL_FORMAT_DEFAULTS } from '../regionalFormatConstants.js'

describe('resolveRegionalFormatSettings', () => {
  it('uses built-in defaults when both rows are null', () => {
    const s = resolveRegionalFormatSettings(null, null)
    expect(s.currency_code).toBe(REGIONAL_FORMAT_DEFAULTS.currency_code)
    expect(s.overrides.currency_code).toBe(false)
  })

  it('applies organisation values', () => {
    const s = resolveRegionalFormatSettings({ currency_code: 'ZAR', locale: 'en-ZA' }, null)
    expect(s.currency_code).toBe('ZAR')
    expect(s.locale).toBe('en-ZA')
    expect(s.decimal_places).toBe(2)
  })

  it('applies only overridden project fields', () => {
    const s = resolveRegionalFormatSettings(
      { currency_code: 'USD', decimal_places: 2 },
      { currency_code: 'EUR', decimal_places: null },
    )
    expect(s.currency_code).toBe('EUR')
    expect(s.overrides.currency_code).toBe(true)
    expect(s.decimal_places).toBe(2)
    expect(s.overrides.decimal_places).toBe(false)
  })

  it('buildProjectOverridePayload nulls non-overridden keys', () => {
    const payload = buildProjectOverridePayload(
      { currency_code: true, locale: false },
      { currency_code: 'GBP', locale: 'en-GB' },
    )
    expect(payload.currency_code).toBe('GBP')
    expect(payload.locale).toBeNull()
  })
})

describe('local field helpers (v1065)', () => {
  const orgDef = { id: 'd1', project_id: null, value_type: 'text', default_value: 'hello' }
  const projOnly = { id: 'd2', project_id: 'p1', value_type: 'number', default_value: '10' }

  it('parseLocalFieldDefault coerces types', () => {
    expect(parseLocalFieldDefault('boolean', 'yes')).toBe(true)
    expect(parseLocalFieldDefault('number', '3.5')).toBe(3.5)
    expect(parseLocalFieldDefault('text', null)).toBe('')
  })

  it('slugifyLocalFieldKey builds snake keys', () => {
    expect(slugifyLocalFieldKey('Invoice Prefix')).toBe('invoice_prefix')
  })

  it('resolveLocalFieldValues inherits org unless overridden', () => {
    const { values, overrides } = resolveLocalFieldValues(
      [orgDef],
      { d1: 'org' },
      { d1: 'proj' },
      {},
    )
    expect(values.d1).toBe('org')
    expect(overrides.d1).toBe(false)

    const over = resolveLocalFieldValues([orgDef], { d1: 'org' }, { d1: 'proj' }, { d1: true })
    expect(over.values.d1).toBe('proj')
    expect(over.overrides.d1).toBe(true)
  })

  it('resolveLocalFieldValues keeps project-only on the project', () => {
    const { values, overrides } = resolveLocalFieldValues([projOnly], {}, { d2: 42 }, {})
    expect(values.d2).toBe(42)
    expect(overrides.d2).toBe(true)
  })

  it('buildLocalFieldProjectPayload only stores overridden org locals + project-only', () => {
    const payload = buildLocalFieldProjectPayload(
      [orgDef, projOnly],
      { d1: true },
      { d1: 'x', d2: 7 },
    )
    expect(payload.local_field_overrides).toEqual({ d1: true })
    expect(payload.local_field_values).toEqual({ d1: 'x', d2: 7 })
  })
})

describe('formatRegional*', () => {
  it('formats currency with settings', () => {
    const out = formatRegionalCurrency(420000, {
      ...REGIONAL_FORMAT_DEFAULTS,
      currency_code: 'USD',
      locale: 'en-US',
      decimal_places: 0,
    })
    expect(out).toMatch(/420/)
    expect(out).toMatch(/\$|USD/)
  })

  it('formats negatives with parentheses when configured', () => {
    const out = formatRegionalNumber(-1234.5, {
      ...REGIONAL_FORMAT_DEFAULTS,
      negative_number_style: 'parentheses',
      decimal_places: 1,
      locale: 'en-US',
      number_grouping: 'comma',
    })
    expect(out.startsWith('(') && out.endsWith(')')).toBe(true)
  })

  it('formats a date', () => {
    const out = formatRegionalDate('2026-09-15T12:00:00Z', {
      ...REGIONAL_FORMAT_DEFAULTS,
      date_format: 'YYYY-MM-DD',
      time_zone: 'UTC',
    })
    expect(out).toBe('2026-09-15')
  })
})
