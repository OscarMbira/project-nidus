/**
 * Unit tests for checkPendingInvitationByEmail (v982 Phase 1, task G).
 * Covers the pre-auth "I was invited" lookup used by RegistrationEntryChoice.jsx:
 * found / not found / malformed input / RPC error, plus a contract test proving the
 * returned shape never leaks an invitation token or id (decision 5 — no resend vector
 * on this unauthenticated screen).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.hoisted(() => vi.fn())

vi.mock('../supabase/supabaseClient', () => ({
  appDb: { rpc: (...args) => mockRpc(...args) },
}))

const { checkPendingInvitationByEmail } = await import('../invitationService')

describe('checkPendingInvitationByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns found=true with the organisation name when a pending invitation exists', async () => {
    mockRpc.mockResolvedValue({
      data: [{ found: true, organisation_name: 'Acme Corporation' }],
      error: null,
    })

    const result = await checkPendingInvitationByEmail('invitee@example.com')

    expect(mockRpc).toHaveBeenCalledWith('check_pending_invitation_by_email', {
      p_email: 'invitee@example.com',
    })
    expect(result).toEqual({
      success: true,
      found: true,
      organisationName: 'Acme Corporation',
      error: null,
    })
  })

  it('returns found=false with a null organisation name when nothing matches', async () => {
    mockRpc.mockResolvedValue({
      data: [{ found: false, organisation_name: null }],
      error: null,
    })

    const result = await checkPendingInvitationByEmail('nobody@example.com')

    expect(result).toEqual({
      success: true,
      found: false,
      organisationName: null,
      error: null,
    })
  })

  it('rejects an empty/whitespace-only email without calling the RPC', async () => {
    const result = await checkPendingInvitationByEmail('   ')

    expect(mockRpc).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(result.found).toBe(false)
  })

  it('surfaces an RPC error without throwing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } })

    const result = await checkPendingInvitationByEmail('invitee@example.com')

    expect(result.success).toBe(false)
    expect(result.found).toBe(false)
    expect(result.error).toBe('connection lost')
  })

  it('handles a single-object RPC response as well as an array', async () => {
    mockRpc.mockResolvedValue({
      data: { found: true, organisation_name: 'Single Row Org' },
      error: null,
    })

    const result = await checkPendingInvitationByEmail('invitee@example.com')

    expect(result.found).toBe(true)
    expect(result.organisationName).toBe('Single Row Org')
  })

  it('contract: never surfaces an invitation token or id even if the RPC response contains one', async () => {
    // Simulates a hypothetical future mistake where the SQL function starts returning
    // more than {found, organisation_name} — this test protects the client contract
    // regardless of what the (mocked) RPC sends back.
    mockRpc.mockResolvedValue({
      data: [{
        found: true,
        organisation_name: 'Acme Corporation',
        invitation_token: 'super-secret-token',
        invitation_id: 'inv-uuid-should-not-leak',
      }],
      error: null,
    })

    const result = await checkPendingInvitationByEmail('invitee@example.com')

    expect(Object.keys(result).sort()).toEqual(['error', 'found', 'organisationName', 'success'])
    expect(result).not.toHaveProperty('invitation_token')
    expect(result).not.toHaveProperty('invitationToken')
    expect(result).not.toHaveProperty('invitation_id')
    expect(result).not.toHaveProperty('invitationId')
    expect(JSON.stringify(result)).not.toContain('super-secret-token')
    expect(JSON.stringify(result)).not.toContain('inv-uuid-should-not-leak')
  })
})
