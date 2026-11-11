import { describe, it, expect } from 'vitest'
import {
  customFieldKey,
  isCustomFieldKey,
  toRegisterField,
  normaliseFieldName,
  findExactFieldMatch,
  findSimilarFields,
  customFieldErrorMessage,
  registerFieldExportValue,
  registerRecordSearchText,
  customFieldSettingsErrors,
  customFieldSettingsFor,
  customFieldDefaultValue,
  validateRegisterCustomValue,
  customFieldHint,
  formatRegisterAmount,
} from '../registerCustomFields'

const LIBRARY = [
  { id: '1', label: 'Vendor Ticket Reference' },
  { id: '2', label: 'Cost Centre' },
  { id: '3', label: 'Second Approver' },
]

describe('custom field keys', () => {
  it('prefixes definition ids and recognises them', () => {
    expect(customFieldKey('abc')).toBe('cf__abc')
    expect(isCustomFieldKey('cf__abc')).toBe(true)
    expect(isCustomFieldKey('product_code')).toBe(false)
  })
})

describe('toRegisterField', () => {
  it('maps an RPC field to the register field shape', () => {
    const field = toRegisterField(
      { id: 'd1', label: 'Priority', field_type: 'dropdown', required: true, options: [{ value: 'high', label: 'High' }] },
      'r1'
    )
    expect(field).toMatchObject({
      field_key: 'cf__d1',
      field_label: 'Priority',
      field_type: 'dropdown',
      is_required: true,
      register_id: 'r1',
      is_custom: true,
      dropdown_options: [{ value: 'high', label: 'High' }],
    })
  })

  it('renders LDE-only types with the nearest input', () => {
    expect(toRegisterField({ id: 'd', label: 'x', field_type: 'integer' }, 'r').field_type).toBe('number')
    expect(toRegisterField({ id: 'd', label: 'x', field_type: 'email' }, 'r').field_type).toBe('text')
  })
})

describe('duplicate detection', () => {
  it('normalises case, spacing and punctuation like the RPC', () => {
    expect(normaliseFieldName('  Vendor ticket-reference ')).toBe('vendorticketreference')
  })

  it('finds an exact match regardless of formatting', () => {
    expect(findExactFieldMatch('vendor TICKET reference', LIBRARY)?.id).toBe('1')
    expect(findExactFieldMatch('Vendor Ticket', LIBRARY)).toBeNull()
  })

  it('also matches an existing field name', () => {
    const library = [{ id: '9', label: 'Vendor reference (ticket)', name: 'lr_vendor_ref' }]
    expect(findExactFieldMatch('Vendor Ref', library)?.id).toBe('9')
  })

  it('suggests similar names but not the exact match', () => {
    expect(findSimilarFields('Vendor Ticket', LIBRARY).map((f) => f.id)).toEqual(['1'])
    expect(findSimilarFields('Cost Center', LIBRARY).map((f) => f.id)).toEqual(['2'])
    expect(findSimilarFields('Cost Centre', LIBRARY)).toEqual([])
    expect(findSimilarFields('Go-live date', LIBRARY)).toEqual([])
  })
})

describe('customFieldErrorMessage', () => {
  it('turns the limit error into plain language', () => {
    const msg = customFieldErrorMessage({ message: 'CUSTOM_FIELD_LIMIT_REACHED: your organisation already has 30 custom fields on this register' })
    expect(msg).toMatch(/limit of 30 custom fields/)
  })

  it('passes other messages through', () => {
    expect(customFieldErrorMessage('Field name must be 2 to 120 characters')).toBe('Field name must be 2 to 120 characters')
  })
})

describe('registerFieldExportValue', () => {
  const dropdown = { field_type: 'dropdown', dropdown_options: [{ value: 'high', label: 'High' }, { value: 'low', label: 'Low' }] }

  it('uses option labels, Yes/No and one item per line', () => {
    expect(registerFieldExportValue('high', dropdown)).toBe('High')
    expect(registerFieldExportValue(['high', 'low'], { ...dropdown, field_type: 'multi_select' })).toBe('High\nLow')
    expect(registerFieldExportValue(true, { field_type: 'boolean' })).toBe('Yes')
    expect(registerFieldExportValue('a\nb', { field_type: 'multi_line' })).toBe('a\nb')
    expect(registerFieldExportValue(null, dropdown)).toBe('')
  })
})

describe('custom field settings (v1314)', () => {
  it('flags impossible ranges and bad defaults before creating', () => {
    expect(customFieldSettingsErrors('number', { min: 10, max: 1 })).toContain('Minimum value cannot be greater than the maximum')
    expect(customFieldSettingsErrors('number', { min: 1, max: 10, defaultValue: 50 })).toContain('The default value must be within the minimum and maximum')
    expect(customFieldSettingsErrors('date', { minDate: '2026-12-01', maxDate: '2026-01-01' })).toHaveLength(1)
    expect(customFieldSettingsErrors('text', { allowedCharacters: 'custom' })).toContain('List the characters that are allowed')
    expect(customFieldSettingsErrors('dropdown', { defaultValue: 'Medium' }, ['Low', 'High'])).toHaveLength(1)
    expect(customFieldSettingsErrors('text', { minLength: 2, maxLength: 20 })).toEqual([])
  })

  it('reports which settings apply to a type', () => {
    expect(customFieldSettingsFor('text')).toMatchObject({ length: true, characters: true, numberRange: false })
    expect(customFieldSettingsFor('multi_select')).toMatchObject({ itemCount: true, characters: false })
  })

  it('resolves defaults, including today for dates', () => {
    const today = new Date(2026, 9, 22)
    expect(customFieldDefaultValue({ field_type: 'date', rules: { defaultValue: 'today' } }, today)).toBe('2026-10-22')
    expect(customFieldDefaultValue({ field_type: 'number', rules: { defaultValue: 5 } })).toBe(5)
    expect(customFieldDefaultValue({ field_type: 'text', rules: {} })).toBeUndefined()
  })

  it('validates values against the rules', () => {
    const code = { field_type: 'text', rules: { minLength: 3, maxLength: 6, pattern: '^[0-9]*$', patternMessage: 'Digits only' } }
    expect(validateRegisterCustomValue(code, '12')).toEqual(['Must be at least 3 characters'])
    expect(validateRegisterCustomValue(code, '12a4')).toEqual(['Digits only'])
    expect(validateRegisterCustomValue(code, '')).toEqual([])
    expect(validateRegisterCustomValue({ field_type: 'number', rules: { min: 1, max: 5 } }, 9)).toEqual(['Must be at most 5'])
    expect(validateRegisterCustomValue({ field_type: 'date', rules: { minDate: '2026-01-01' } }, '2025-12-31')).toEqual(['Must be on or after 2026-01-01'])
    expect(validateRegisterCustomValue({ field_type: 'multi_line', rules: { maxItems: 1, maxLength: 3 } }, 'abcd\nx')).toEqual([
      'Allows at most 1 item',
      'Item 1: Must be at most 3 characters',
    ])
    expect(validateRegisterCustomValue({ field_type: 'multi_select', rules: { minItems: 2 } }, ['a'])).toEqual(['Needs at least 2 items'])
  })

  it('describes the rules in a short hint', () => {
    expect(customFieldHint({ field_type: 'text', rules: { minLength: 2, maxLength: 20, pattern: '^[0-9]*$', patternMessage: 'Digits only' } }))
      .toBe('2–20 characters · Digits only')
    expect(customFieldHint({ field_type: 'number', rules: { min: 1 } })).toBe('At least 1')
    expect(customFieldHint({ field_type: 'text', rules: {} })).toBe('')
  })
})

describe('amount formatting (rule 68)', () => {
  const usd = { currency_code: 'USD', locale: 'en-US', decimal_places: 2 }

  it('formats currency with symbol, grouping and decimals from the regional settings', () => {
    expect(formatRegisterAmount(18500000, { field_type: 'currency' }, usd)).toBe('$18,500,000.00')
    expect(formatRegisterAmount('2650000', { field_type: 'currency' }, { ...usd, currency_code: 'ZAR', locale: 'en-ZA' }))
      .toMatch(/R\s?2[\s,]650[\s,]000[.,]00/)
    expect(registerFieldExportValue(18500000, { field_type: 'currency' }, usd)).toBe('$18,500,000.00')
  })

  it('groups plain numbers but keeps their own decimals', () => {
    expect(formatRegisterAmount(850000, { field_type: 'number' }, usd)).toBe('850,000')
    expect(formatRegisterAmount(70, { field_type: 'number' }, usd)).toBe('70')
    expect(formatRegisterAmount('12.5', { field_type: 'number' }, usd)).toBe('12.5')
  })

  it('leaves non-amount fields and non-numeric values alone', () => {
    expect(formatRegisterAmount('RCA-100', { field_type: 'text' }, usd)).toBeNull()
    expect(formatRegisterAmount('abc', { field_type: 'currency' }, usd)).toBeNull()
    expect(formatRegisterAmount('', { field_type: 'currency' }, usd)).toBeNull()
  })
})

describe('registerRecordSearchText', () => {
  it('includes title, display id and every field value (custom included)', () => {
    const text = registerRecordSearchText({
      title: 'Home Loan',
      display_id: 'LREG-2026-001',
      field_values: { product_code: 'RHL-600', cf__x: 'VT-99', cf__y: ['branch', 'mobile'] },
    })
    expect(text).toContain('home loan')
    expect(text).toContain('lreg-2026-001')
    expect(text).toContain('vt-99')
    expect(text).toContain('mobile')
  })
})
