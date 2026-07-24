import { describe, it, expect } from 'vitest'
import { shouldTryLegacyInvitationInsert } from '../projectMembershipService'

describe('shouldTryLegacyInvitationInsert', () => {
  it('uses legacy path when RPC is not deployed', () => {
    expect(shouldTryLegacyInvitationInsert({ code: 'PGRST202' }, true)).toBe(true)
  })

  it('uses legacy path for PM forbidden responses', () => {
    expect(
      shouldTryLegacyInvitationInsert(
        { code: '42501', message: 'Forbidden: PMO suite admin or project invite access required' },
        false,
      ),
    ).toBe(true)
    expect(
      shouldTryLegacyInvitationInsert(
        { code: '42501', message: 'Permission denied: caller is not a PMO admin (auth uid: x)' },
        false,
      ),
    ).toBe(true)
    expect(
      shouldTryLegacyInvitationInsert(
        { code: '42501', message: 'Caller is not a pmo admin' },
        false,
      ),
    ).toBe(true)
  })

  it('does not use legacy path for auth errors', () => {
    expect(
      shouldTryLegacyInvitationInsert({ code: '42501', message: 'Not authenticated' }, false),
    ).toBe(false)
  })

  it('falls back to direct insert after client RPC timeout', () => {
    expect(
      shouldTryLegacyInvitationInsert({ code: 'CLIENT_TIMEOUT', message: 'timed out' }, false),
    ).toBe(true)
    expect(
      shouldTryLegacyInvitationInsert(
        { status: 408, code: '408', message: 'Invitation RPC timed out' },
        false,
      ),
    ).toBe(true)
  })
})
