import { describe, it, expect } from 'vitest'
import { isValidAccountId } from '../accountResolution'

describe('accountResolution', () => {
  describe('isValidAccountId', () => {
    it('rejects null, undefined, empty, and literal "null"', () => {
      expect(isValidAccountId(null)).toBe(false)
      expect(isValidAccountId(undefined)).toBe(false)
      expect(isValidAccountId('')).toBe(false)
      expect(isValidAccountId('null')).toBe(false)
    })

    it('accepts a valid UUID', () => {
      expect(isValidAccountId('42a1c47a-c1bf-4ea3-a78c-cd278270458d')).toBe(true)
    })
  })
})
