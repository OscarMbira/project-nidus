import { describe, it, expect } from 'vitest'
import {
  clampInvitationExpiryDays,
  INVITE_EXPIRY_FALLBACK_DAYS,
  INVITE_EXPIRY_MAX_DAYS,
  INVITE_EXPIRY_MIN_DAYS,
} from '../invitationExpiryService'

describe('invitationExpiryService', () => {
  describe('clampInvitationExpiryDays', () => {
    it('clamps to bounds', () => {
      expect(clampInvitationExpiryDays(0)).toBe(INVITE_EXPIRY_MIN_DAYS)
      expect(clampInvitationExpiryDays(999)).toBe(INVITE_EXPIRY_MAX_DAYS)
      expect(clampInvitationExpiryDays(14)).toBe(14)
    })

    it('falls back for invalid input', () => {
      expect(clampInvitationExpiryDays(NaN)).toBe(INVITE_EXPIRY_FALLBACK_DAYS)
      expect(clampInvitationExpiryDays('')).toBe(INVITE_EXPIRY_FALLBACK_DAYS)
    })
  })
})
