/**
 * useDashboardViewerContext tests (v982 Phase 5 follow-up — Portfolio/Programme Manager Home).
 * Focuses on the new portfolio/programme role resolution added this follow-up — reuses the
 * existing has_portfolio_role/has_programme_role RPCs (SQL/v992), not a parallel resolver.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { mockPlatformDb } = vi.hoisted(() => ({
  mockPlatformDb: { auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(() => Promise.resolve('acct-1')),
}))
vi.mock('../../../services/roleService', () => ({
  getUserSystemRoles: vi.fn(() => Promise.resolve({ success: true, data: [{ roles: { role_name: 'team_member' } }] })),
}))

import { useDashboardViewerContext } from '../useDashboardViewerContext'

function chain(result) {
  const obj = { select: vi.fn(() => obj), eq: vi.fn(() => obj), maybeSingle: vi.fn(() => Promise.resolve(result)) }
  return obj
}

describe('useDashboardViewerContext — portfolio/programme role resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockPlatformDb.from.mockReturnValue(chain({ data: { id: 'user-1', account_type: 'company', owner_user_id: 'someone-else' }, error: null }))
  })

  it('resolves isPortfolioManager true when has_portfolio_role RPC returns true', async () => {
    mockPlatformDb.rpc.mockImplementation((fn) => {
      if (fn === 'has_portfolio_role') return Promise.resolve({ data: true })
      return Promise.resolve({ data: false })
    })

    const { result } = renderHook(() => useDashboardViewerContext({ portfolioId: 'pf-1' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.context.isPortfolioManager).toBe(true)
    expect(mockPlatformDb.rpc).toHaveBeenCalledWith('has_portfolio_role', {
      p_auth_user_id: 'auth-1',
      p_portfolio_id: 'pf-1',
      p_role_names: ['portfolio_manager'],
    })
  })

  it('resolves isProgrammeManager true when has_programme_role RPC returns true', async () => {
    mockPlatformDb.rpc.mockImplementation((fn) => {
      if (fn === 'has_programme_role') return Promise.resolve({ data: true })
      return Promise.resolve({ data: false })
    })

    const { result } = renderHook(() => useDashboardViewerContext({ programmeId: 'prog-1' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.context.isProgrammeManager).toBe(true)
  })

  it('does not call either RPC when neither portfolioId nor programmeId is passed', async () => {
    mockPlatformDb.rpc.mockResolvedValue({ data: false })

    const { result } = renderHook(() => useDashboardViewerContext())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockPlatformDb.rpc.mock.calls.filter((c) => c[0] === 'has_portfolio_role')).toHaveLength(0)
    expect(mockPlatformDb.rpc.mock.calls.filter((c) => c[0] === 'has_programme_role')).toHaveLength(0)
    expect(result.current.context.isPortfolioManager).toBe(false)
    expect(result.current.context.isProgrammeManager).toBe(false)
  })

  it('defaults to false (never throws) when the RPC call fails', async () => {
    mockPlatformDb.rpc.mockImplementation((fn) => {
      if (fn === 'has_portfolio_role') return Promise.reject(new Error('network error'))
      return Promise.resolve({ data: false })
    })

    const { result } = renderHook(() => useDashboardViewerContext({ portfolioId: 'pf-1' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.context.isPortfolioManager).toBe(false)
  })

  it('still merges extra scope values (portfolioId/programmeId) into the returned context verbatim', async () => {
    mockPlatformDb.rpc.mockResolvedValue({ data: false })

    const { result } = renderHook(() => useDashboardViewerContext({ portfolioId: 'pf-1', programmeId: 'prog-1' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.context.portfolioId).toBe('pf-1')
    expect(result.current.context.programmeId).toBe('prog-1')
  })
})
