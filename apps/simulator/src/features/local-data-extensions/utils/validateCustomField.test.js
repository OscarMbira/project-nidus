import { describe, it, expect } from 'vitest'
import { validateSingleField, validateGroupRowBounds } from './validateCustomField'

describe('validateSingleField', () => {
  it('fails when required and empty', () => {
    const def = { label: 'Name', field_type: 'text', validation_rules: { required: true } }
    expect(validateSingleField(def, '').ok).toBe(false)
    expect(validateSingleField(def, null).ok).toBe(false)
    expect(validateSingleField(def, 'x').ok).toBe(true)
  })

  it('enforces maxLength', () => {
    const def = { field_type: 'text', validation_rules: { maxLength: 3 } }
    expect(validateSingleField(def, 'abcd').ok).toBe(false)
    expect(validateSingleField(def, 'abc').ok).toBe(true)
  })

  it('enforces number range', () => {
    const def = { field_type: 'number', validation_rules: { min: 2, max: 5 } }
    expect(validateSingleField(def, 1).ok).toBe(false)
    expect(validateSingleField(def, 6).ok).toBe(false)
    expect(validateSingleField(def, 3).ok).toBe(true)
  })

  it('rejects non-integer for integer type', () => {
    const def = { field_type: 'integer', validation_rules: {} }
    expect(validateSingleField(def, 3.5).ok).toBe(false)
  })

  it('validates dropdown against options', () => {
    const def = {
      field_type: 'dropdown',
      options: [{ option_value: 'a' }, { option_value: 'b' }],
    }
    expect(validateSingleField(def, 'a').ok).toBe(true)
    expect(validateSingleField(def, 'z').ok).toBe(false)
  })

  it('validates regex pattern', () => {
    const def = {
      field_type: 'text',
      validation_rules: { pattern: '^[0-9]+$' },
    }
    expect(validateSingleField(def, '12').ok).toBe(true)
    expect(validateSingleField(def, 'ab').ok).toBe(false)
  })

  it('enforces uniquePerEntity when helper set is provided', () => {
    const def = {
      field_type: 'text',
      validation_rules: { uniquePerEntity: true },
      __existingValuesForUnique: new Set(['taken']),
    }
    expect(validateSingleField(def, 'taken').ok).toBe(false)
    expect(validateSingleField(def, 'free').ok).toBe(true)
  })
})

describe('validateGroupRowBounds', () => {
  it('enforces min and max rows', () => {
    expect(validateGroupRowBounds({ min_rows: 2, max_rows: 3 }, 1).ok).toBe(false)
    expect(validateGroupRowBounds({ min_rows: 2, max_rows: 3 }, 4).ok).toBe(false)
    expect(validateGroupRowBounds({ min_rows: 2, max_rows: 3 }, 2).ok).toBe(true)
  })
})
