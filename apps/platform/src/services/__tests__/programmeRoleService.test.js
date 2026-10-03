/**
 * Unit tests for programmeRoleService (v982 Phase 3 — Portfolio/Programme-Scoped Roles &
 * Authority Model). Mirrors portfolioRoleService.test.js's rigor. Includes the mandatory
 * cross-scope leak test: a role at one scope (e.g. Programme X) must never leak authority to a
 * sibling scope (Programme Y) or an unrelated portfolio — same class of test the plan's task D
 * requires. As with portfolioRoleService.test.js, this is a JS-layer contract test on the client
 * gating logic; the actual authorization boundary is server-side RLS (SQL/v992), not executed
 * against a live database this session (ground rule).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn(), auth: { getUser: vi.fn() }, rpc: vi.fn() },
}))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(),
}))
vi.mock('../roleService', () => ({ getUserSystemRoles: vi.fn() }))
vi.mock('../organisationRoleService', () => ({ getOrganisationUsers: vi.fn() }))

const { platformDb } = await import('@nidus/supabase')
const { getCurrentUserAccountId } = await import('@nidus/shared/utils/accountResolution')
const { getUserSystemRoles } = await import('../roleService')
const { getProgrammeMembershipAccess } = await import('../programmeRoleService')

function mockProgramme(programme) {
  platformDb.from.mockImplementation((table) => {
    if (table === 'programmes') {
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: programme, error: null })) }
    }
    if (table === 'users') {
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'internal-user-1' }, error: null })) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('programmeRoleService — getProgrammeMembershipAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-caller' } } })
  })

  it('grants canManage when has_programme_role RPC returns true for THIS programme', async () => {
    platformDb.rpc.mockImplementation((fn, args) => {
      if (fn === 'has_programme_role' && args.p_programme_id === 'prog-X') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: false, error: null })
    })
    mockProgramme({ id: 'prog-X', account_id: 'acct-A', portfolio_id: null, programme_owner_user_id: null, programme_manager_user_id: null })

    const res = await getProgrammeMembershipAccess('prog-X')

    expect(res.canManage).toBe(true)
  })

  it('CROSS-SCOPE LEAK CHECK: a role grant on Programme X does not grant access on sibling Programme Y', async () => {
    // has_programme_role always resolves against the SPECIFIC programme id passed in — simulate
    // the RPC correctly returning false for Programme Y even though the caller has a real grant
    // on Programme X (proves the service asks the RPC per-programme-id, not a cached/global flag).
    platformDb.rpc.mockImplementation((fn, args) => {
      if (fn === 'has_programme_role' && args.p_programme_id === 'prog-X') return Promise.resolve({ data: true, error: null })
      if (fn === 'has_programme_role' && args.p_programme_id === 'prog-Y') return Promise.resolve({ data: false, error: null })
      if (fn === 'has_portfolio_role') return Promise.resolve({ data: false, error: null })
      return Promise.resolve({ data: false, error: null })
    })
    mockProgramme({ id: 'prog-Y', account_id: 'acct-A', portfolio_id: null, programme_owner_user_id: null, programme_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'team_member' } }] })

    const res = await getProgrammeMembershipAccess('prog-Y')

    expect(res.canManage).toBe(false)
    expect(platformDb.rpc).toHaveBeenCalledWith('has_programme_role', {
      p_auth_user_id: 'auth-caller',
      p_programme_id: 'prog-Y',
      p_role_names: ['programme_manager'],
    })
  })

  it('CROSS-SCOPE LEAK CHECK: portfolio_manager on Portfolio A does not grant access on a programme under an UNRELATED Portfolio B', async () => {
    platformDb.rpc.mockImplementation((fn, args) => {
      if (fn === 'has_programme_role') return Promise.resolve({ data: false, error: null })
      if (fn === 'has_portfolio_role' && args.p_portfolio_id === 'portfolio-B') return Promise.resolve({ data: false, error: null })
      if (fn === 'has_portfolio_role' && args.p_portfolio_id === 'portfolio-A') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: false, error: null })
    })
    // the programme under test belongs to portfolio-B, NOT portfolio-A (where the caller has a real grant)
    mockProgramme({ id: 'prog-under-B', account_id: 'acct-A', portfolio_id: 'portfolio-B', programme_owner_user_id: null, programme_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'team_member' } }] })

    const res = await getProgrammeMembershipAccess('prog-under-B')

    expect(res.canManage).toBe(false)
  })

  it('a Portfolio Manager DOES gain programme-membership-management access for a programme genuinely under their own portfolio', async () => {
    platformDb.rpc.mockImplementation((fn, args) => {
      if (fn === 'has_programme_role') return Promise.resolve({ data: false, error: null })
      if (fn === 'has_portfolio_role' && args.p_portfolio_id === 'portfolio-A') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: false, error: null })
    })
    mockProgramme({ id: 'prog-under-A', account_id: 'acct-A', portfolio_id: 'portfolio-A', programme_owner_user_id: null, programme_manager_user_id: null })

    const res = await getProgrammeMembershipAccess('prog-under-A')

    expect(res.canManage).toBe(true)
  })

  it('CROSS-TENANT LEAK CHECK: a PMO Admin of a different account never gets canManage', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockProgramme({ id: 'prog-X', account_id: 'acct-A', portfolio_id: null, programme_owner_user_id: null, programme_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'pmo_admin' } }] })
    getCurrentUserAccountId.mockResolvedValue('acct-B')

    const res = await getProgrammeMembershipAccess('prog-X')

    expect(res.canManage).toBe(false)
  })

  it('fails fast without a programme id', async () => {
    const res = await getProgrammeMembershipAccess(null)
    expect(res.success).toBe(false)
  })
})
