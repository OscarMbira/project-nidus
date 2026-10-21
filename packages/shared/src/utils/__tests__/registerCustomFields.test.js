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
