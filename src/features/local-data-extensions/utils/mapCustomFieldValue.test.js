import { describe, it, expect } from 'vitest'
import { serializeCustomFieldValue, deserializeCustomFieldValue } from './mapCustomFieldValue'

describe('serializeCustomFieldValue', () => {
  it('clears all value columns when empty', () => {
    const z = serializeCustomFieldValue('text', '')
    expect(z.value_text).toBeNull()
    expect(z.value_number).toBeNull()
    expect(z.value_json).toBeNull()
  })

  it('maps number and integer', () => {
    expect(serializeCustomFieldValue('number', 1.5).value_number).toBe(1.5)
    expect(serializeCustomFieldValue('integer', 3.7).value_number).toBe(3)
  })

  it('maps multi_select to JSON', () => {
    const row = serializeCustomFieldValue('multi_select', ['a', 'b'])
    expect(row.value_json).toEqual(['a', 'b'])
  })

  it('maps plain types to value_text', () => {
    expect(serializeCustomFieldValue('text', 'hello').value_text).toBe('hello')
    expect(serializeCustomFieldValue('email', 'a@b.co').value_text).toBe('a@b.co')
  })
})

describe('deserializeCustomFieldValue', () => {
  it('round-trips number fields', () => {
    const cols = serializeCustomFieldValue('number', 42)
    expect(deserializeCustomFieldValue('number', cols)).toBe(42)
  })

  it('reads multi_select from JSON column', () => {
    const cols = { value_json: ['x'] }
    expect(deserializeCustomFieldValue('multi_select', cols)).toEqual(['x'])
  })

  it('returns null for missing row', () => {
    expect(deserializeCustomFieldValue('text', null)).toBeNull()
  })
})
