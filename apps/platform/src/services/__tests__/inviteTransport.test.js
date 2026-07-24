import { describe, it, expect } from 'vitest'
import { formatInvitationInviteError, TIMEOUT_USER_MESSAGE } from '../inviteTransport'

describe('formatInvitationInviteError', () => {
  it('maps generic timeout to v597 guidance', () => {
    const out = formatInvitationInviteError('Invitation RPC timed out')
    expect(out).toContain('v597')
  })

  it('passes through constant timeout message', () => {
    expect(formatInvitationInviteError(TIMEOUT_USER_MESSAGE)).toBe(TIMEOUT_USER_MESSAGE)
  })

  it('appends v597 hint for forbidden responses', () => {
    const out = formatInvitationInviteError(
      'Forbidden: PMO suite admin or active project membership required',
      { requiresDbSetup: true },
    )
    expect(out).toContain('Forbidden')
    expect(out).toContain('v597')
  })
})
