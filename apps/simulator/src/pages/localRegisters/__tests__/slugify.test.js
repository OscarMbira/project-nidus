/**
 * Unit tests for slugify() — used to derive register_key/field_key from user-typed labels in
 * RegisterDefinitionBuilder (v931). Correctness matters here: these become the join keys
 * (menu_code-equivalent) other Local Register Engine code matches on.
 */
import { describe, it, expect } from 'vitest'
import { slugify } from '../RegisterDefinitionBuilder'

describe('slugify (v931 RegisterDefinitionBuilder)', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(slugify('Client Onboarding Checklist')).toBe('client_onboarding_checklist')
  })

  it('collapses non-alphanumeric runs into a single underscore', () => {
    expect(slugify('Permit #  / Type!!')).toBe('permit_type')
  })

  it('trims leading/trailing underscores', () => {
    expect(slugify('  -Core Banking-  ')).toBe('core_banking')
  })

  it('returns an empty string for blank/nullish input', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })

  it('preserves existing underscores and digits', () => {
    expect(slugify('field_2_value')).toBe('field_2_value')
  })
})
