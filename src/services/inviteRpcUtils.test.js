import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildInvitationRpcPayload,
  isInvitationRpcMissingOrUnreachable,
  invitationRpcSetupSuffix,
  probePostgrestRpcListedInOpenApi,
} from './inviteRpcUtils.js'

describe('isInvitationRpcMissingOrUnreachable', () => {
  it('returns true when HTTP status is 404 even if error body is empty', () => {
    expect(isInvitationRpcMissingOrUnreachable({ message: '' }, 404)).toBe(true)
    expect(isInvitationRpcMissingOrUnreachable(null, 404)).toBe(true)
    expect(isInvitationRpcMissingOrUnreachable(undefined, '404')).toBe(true)
  })

  it('returns false when status is 200 and no rpc error', () => {
    expect(isInvitationRpcMissingOrUnreachable(null, 200)).toBe(false)
    expect(isInvitationRpcMissingOrUnreachable(undefined, undefined)).toBe(false)
  })

  it('detects PGRST202 without HTTP status', () => {
    expect(
      isInvitationRpcMissingOrUnreachable(
        { code: 'PGRST202', message: 'Could not find the function' },
        undefined,
      ),
    ).toBe(true)
  })

  it('detects “could not find the function” in message', () => {
    expect(
      isInvitationRpcMissingOrUnreachable(
        { message: 'could not find the function public.insert_project_invitation_as_pmo_admin' },
        undefined,
      ),
    ).toBe(true)
  })

  it('returns false for unrelated permission errors', () => {
    expect(
      isInvitationRpcMissingOrUnreachable(
        { code: '42501', message: 'permission denied for table project_invitations' },
        403,
      ),
    ).toBe(false)
  })
})

describe('invitationRpcSetupSuffix', () => {
  it('mentions migration file and diagnostic SQL path', () => {
    const s = invitationRpcSetupSuffix()
    expect(s).toContain('20260510120000_pmo_invitation_rpc_v553')
    expect(s).toContain('v555_diag_invitation_rpc.sql')
    expect(s).toContain('overload_count')
  })
})

describe('probePostgrestRpcListedInOpenApi', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns rpcListed true when OpenAPI lists exact rpc path', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify({
          paths: {
            '/rpc/insert_project_invitation_as_pmo_admin': { post: {} },
            '/rpc/other': { post: {} },
          },
        }),
    })
    const r = await probePostgrestRpcListedInOpenApi(
      'https://abc.supabase.co',
      'anon-key',
      'insert_project_invitation_as_pmo_admin',
      null,
    )
    expect(r.rpcListed).toBe(true)
    expect(r.rpcPaths.some((p) => p.endsWith('insert_project_invitation_as_pmo_admin'))).toBe(true)
  })

  it('returns rpcListed false when path missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ paths: { '/users': { get: {} } } }),
    })
    const r = await probePostgrestRpcListedInOpenApi(
      'https://abc.supabase.co',
      'anon-key',
      'insert_project_invitation_as_pmo_admin',
      null,
    )
    expect(r.rpcListed).toBe(false)
  })
})

describe('buildInvitationRpcPayload', () => {
  const expires = '2026-05-10T12:00:00.000Z'

  it('always JSON-serializes all seven parameter keys (no undefined omissions)', () => {
    const payload = buildInvitationRpcPayload(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '11111111-2222-3333-4444-555555555555',
      { email: 'a@b.com', message: undefined },
      expires,
    )
    const json = JSON.stringify(payload)
    expect(json).toContain('"p_project_id"')
    expect(json).toContain('"p_invited_email"')
    expect(json).toContain('"p_role_id"')
    expect(json).toContain('"p_invitation_message"')
    expect(json).toContain('"p_invitation_expires_at"')
    expect(json).toContain('"p_invited_first_name"')
    expect(json).toContain('"p_invited_last_name"')
    expect(payload.p_invitation_message).toBe(null)
    expect(payload.p_invited_first_name).toBe(null)
    expect(payload.p_invited_last_name).toBe(null)
  })

  it('maps invitee first and last name when provided', () => {
    const payload = buildInvitationRpcPayload(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '11111111-2222-3333-4444-555555555555',
      { email: 'a@b.com', inviteeFirstName: ' Jane ', inviteeLastName: ' Doe ' },
      expires,
    )
    expect(payload.p_invited_first_name).toBe('Jane')
    expect(payload.p_invited_last_name).toBe('Doe')
  })

  it('trims email and maps blank message to null', () => {
    const payload = buildInvitationRpcPayload(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '11111111-2222-3333-4444-555555555555',
      { email: '  x@y.com  ', message: '   ' },
      expires,
    )
    expect(payload.p_invited_email).toBe('x@y.com')
    expect(payload.p_invitation_message).toBe(null)
  })
})
