import { describe, it, expect } from 'vitest'
import {
  isValidSenderDomain,
  resolveSenderFromProfiles,
  parseSenderProfileInput,
} from '../emailSenderProfileService'
import { RESEND_DEFAULT_FROM_DOMAIN } from '../emailConfigService'

describe('emailSenderProfileService', () => {
  describe('parseSenderProfileInput', () => {
    it('requires project type when not system default', () => {
      const { errors, isDefault } = parseSenderProfileInput({
        profile_name: 'IT Projects',
        is_default: false,
        project_type_id: '',
      })
      expect(isDefault).toBe(false)
      expect(errors).toContain('Select a project type or enable System Default.')
    })

    it('allows system default without project type', () => {
      const { errors, isDefault, projectTypeId } = parseSenderProfileInput({
        profile_name: 'Default',
        is_default: true,
        project_type_id: '',
      })
      expect(isDefault).toBe(true)
      expect(projectTypeId).toBeNull()
      expect(errors).not.toContain('Select a project type or enable System Default.')
    })
  })

  describe('isValidSenderDomain', () => {
    it('accepts emails on the verified domain', () => {
      expect(isValidSenderDomain('noreply@updates.projectastute.com')).toBe(true)
      expect(isValidSenderDomain('build@updates.projectastute.com', RESEND_DEFAULT_FROM_DOMAIN)).toBe(true)
    })

    it('rejects other domains', () => {
      expect(isValidSenderDomain('user@gmail.com')).toBe(false)
      expect(isValidSenderDomain('noreply@projectastute.com')).toBe(false)
      expect(isValidSenderDomain('')).toBe(false)
    })
  })

  describe('resolveSenderFromProfiles', () => {
    const profiles = [
      {
        id: 'default-id',
        project_type_id: null,
        from_email: 'noreply@updates.projectastute.com',
        from_name: 'Project Nidus',
        is_default: true,
        is_active: true,
        is_deleted: false,
      },
      {
        id: 'construction-id',
        project_type_id: 'type-construction',
        from_email: 'build@updates.projectastute.com',
        from_name: 'Nidus Build',
        is_default: false,
        is_active: true,
        is_deleted: false,
      },
    ]

    const globalConfig = {
      from_email: 'fallback@updates.projectastute.com',
      from_name: 'Global Fallback',
    }

    it('returns exact project type match', () => {
      const result = resolveSenderFromProfiles('type-construction', profiles, globalConfig)
      expect(result.from_email).toBe('build@updates.projectastute.com')
      expect(result.from_name).toBe('Nidus Build')
      expect(result.profile_id).toBe('construction-id')
    })

    it('falls back to default profile when type has no match', () => {
      const result = resolveSenderFromProfiles('type-unknown', profiles, globalConfig)
      expect(result.from_email).toBe('noreply@updates.projectastute.com')
      expect(result.profile_id).toBe('default-id')
    })

    it('falls back to global config when no profiles', () => {
      const result = resolveSenderFromProfiles('type-construction', [], globalConfig)
      expect(result.from_email).toBe('fallback@updates.projectastute.com')
      expect(result.from_name).toBe('Global Fallback')
      expect(result.profile_id).toBeNull()
    })

    it('uses default profile when project_type_id is omitted', () => {
      const result = resolveSenderFromProfiles(null, profiles, globalConfig)
      expect(result.profile_id).toBe('default-id')
    })
  })
})
