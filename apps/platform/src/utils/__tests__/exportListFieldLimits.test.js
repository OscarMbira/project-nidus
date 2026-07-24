import { describe, it, expect } from 'vitest'
import { DEFAULT_LIST_EXPORT_FIELDS, MAX_LIST_EXPORT_FIELDS } from '../exportUtils'

describe('exportUtils list field limits (CLAUDE.md rule 38)', () => {
  it('default selection does not exceed max', () => {
    expect(DEFAULT_LIST_EXPORT_FIELDS).toBeLessThanOrEqual(MAX_LIST_EXPORT_FIELDS)
  })
  it('defaults to 5 and max to 10', () => {
    expect(DEFAULT_LIST_EXPORT_FIELDS).toBe(5)
    expect(MAX_LIST_EXPORT_FIELDS).toBe(10)
  })
})
