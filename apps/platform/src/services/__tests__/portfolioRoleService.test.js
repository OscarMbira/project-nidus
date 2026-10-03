/**
 * Unit tests for portfolioRoleService (v982 Phase 3 — Portfolio/Programme-Scoped Roles &
 * Authority Model). Focuses on getPortfolioMembershipAccess — the client-side mirror of the RLS
 * write policy (SQL/v992) — since the actual authorization boundary is server-side RLS, which
 * this session did not execute against a live database (ground rule: no live SQL execution).
 * These tests are a contract check on the JS gating logic; the equivalent SQL policy itself
 * should be verified against a live/staging database before this phase is treated as fully
 * verified (see the plan file's review section).
 *
 * The brief's own worked example as a literal test case: a user with NO portfolio_memberships
 * row, who is not the portfolio's owner/manager, and who is not a PMO Admin of the SAME account
 * that owns the portfolio, must never be granted canManage — even if they hold pmo_admin in a
 * DIFFERENT account (the cross-tenant leak case).
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
const { getPortfolioMembershipAccess } = await import('../portfolioRoleService')

function mockPortfolio(portfolio) {
  platformDb.from.mockImplementation((table) => {
    if (table === 'portfolios') {
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: portfolio, error: null })) }
    }
    if (table === 'users') {
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'internal-user-1' }, error: null })) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('portfolioRoleService — getPortfolioMembershipAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-caller' } } })
  })

  it('grants canManage when has_portfolio_role RPC returns true (explicit membership grant)', async () => {
    platformDb.rpc.mockResolvedValue({ data: true, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: null, portfolio_manager_user_id: null })

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(true)
    expect(platformDb.rpc).toHaveBeenCalledWith('has_portfolio_role', {
      p_auth_user_id: 'auth-caller',
      p_portfolio_id: 'pf-1',
      p_role_names: ['portfolio_manager'],
    })
  })

  it('denies canManage for a user with no grant, not the owner/manager, and not PMO admin of the owning account', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: 'other-user', portfolio_manager_user_id: 'other-user-2' })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'team_member' } }] })

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(false)
  })

  it('CROSS-TENANT LEAK CHECK: a PMO Admin of a DIFFERENT account never gets canManage on this portfolio', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: null, portfolio_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'pmo_admin' } }] })
    // caller's own current account is acct-B, NOT acct-A (the portfolio's owning account)
    getCurrentUserAccountId.mockResolvedValue('acct-B')

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(false)
  })

  it('grants canManage to the PMO Admin of the SAME account that owns the portfolio', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: null, portfolio_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'pmo_admin' } }] })
    getCurrentUserAccountId.mockResolvedValue('acct-A')

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(true)
  })

  it('grants canManage to system_admin regardless of account', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: null, portfolio_manager_user_id: null })
    getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'system_admin' } }] })
    getCurrentUserAccountId.mockResolvedValue('acct-B')

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(true)
  })

  it('grants canManage to the portfolio\'s own direct owner/manager field (bootstrap path)', async () => {
    platformDb.rpc.mockResolvedValue({ data: false, error: null })
    mockPortfolio({ id: 'pf-1', account_id: 'acct-A', portfolio_owner_user_id: 'internal-user-1', portfolio_manager_user_id: null })

    const res = await getPortfolioMembershipAccess('pf-1')

    expect(res.canManage).toBe(true)
  })

  it('fails fast without a portfolio id', async () => {
    const res = await getPortfolioMembershipAccess(null)
    expect(res.success).toBe(false)
  })
})
