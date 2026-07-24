import { describe, it, expect } from 'vitest'
import { isUuid, isLikelyDatabaseUuid } from '../isUuid.js'

describe('isUuid (strict v4)', () => {
  it('accepts lowercase v4', () => {
    expect(isUuid('e550e840-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('accepts uppercase v4', () => {
    expect(isUuid('E550E840-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('rejects codes', () => {
    expect(isUuid('PRJ-0001')).toBe(false)
    expect(isUuid('SCN-0001')).toBe(false)
    expect(isUuid('RISK-0042')).toBe(false)
  })

  it('rejects empty and null', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })

  it('rejects v1-style UUID (variant not 8/9/a/b)', () => {
    expect(isUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false)
  })

  it('rejects partial UUID', () => {
    expect(isUuid('45523ddf-8464-49d7-aafa')).toBe(false)
  })
})

describe('isLikelyDatabaseUuid', () => {
  it('accepts strict v4', () => {
    expect(isLikelyDatabaseUuid('e550e840-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('accepts non-v4 canonical UUID for legacy bookmarks', () => {
    expect(isLikelyDatabaseUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
  })

  it('rejects codes', () => {
    expect(isLikelyDatabaseUuid('PRJ-0001')).toBe(false)
  })
})
