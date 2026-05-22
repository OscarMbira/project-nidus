import { describe, it, expect } from 'vitest'
import { deriveRoleSlug } from '../bulkRoleService'

describe('bulkRoleService', () => {
  describe('deriveRoleSlug', () => {
    it('slugifies display names', () => {
      expect(deriveRoleSlug('Senior Developer', [])).toBe('senior_developer')
    })

    it('appends suffix when slug exists', () => {
      expect(deriveRoleSlug('Team Member', ['team_member'])).toBe('team_member_2')
    })

    it('handles empty input', () => {
      expect(deriveRoleSlug('   ', [])).toBe('custom_role')
    })
  })
})
