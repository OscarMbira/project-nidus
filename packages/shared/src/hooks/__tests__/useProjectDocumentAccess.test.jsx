/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'

afterEach(cleanup)

const { mockPlatformDb, mockFetchUserRoleNamesForAuthUser } = vi.hoisted(() => ({
  mockPlatformDb: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
  mockFetchUserRoleNamesForAuthUser: vi.fn(),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))
vi.mock('@nidus/shared/utils/menuLayoutUtils', () => ({
  fetchUserRoleNamesForAuthUser: mockFetchUserRoleNamesForAuthUser,
}))

import { useProjectDocumentAccess } from '../useProjectDocumentAccess.js'

function chainable(result) {
  const obj = {}
  ;['select', 'eq'].forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.maybeSingle = vi.fn(() => Promise.resolve(result))
  return obj
}

beforeEach(() => {
  mockPlatformDb.auth.getUser.mockReset()
  mockPlatformDb.from.mockReset()
  mockFetchUserRoleNamesForAuthUser.mockReset()
})

describe('useProjectDocumentAccess', () => {
  it('project_manager keeps full manage access, no membership check performed', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFetchUserRoleNamesForAuthUser.mockResolvedValue(['project_manager'])

    const { result } = renderHook(() => useProjectDocumentAccess({ projectId: 'proj-1' }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canManage).toBe(true)
    expect(result.current.isMember).toBe(true)
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('team_member is read-only and gets isMember=true when they are on the project (public schema)', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFetchUserRoleNamesForAuthUser.mockResolvedValue(['team_member'])
    const usersChain = chainable({ data: { id: 'internal-user-1' } })
    const membershipChain = chainable({ data: { id: 'membership-1' } })
    mockPlatformDb.from
      .mockReturnValueOnce(usersChain) // internal user id lookup
    const db = { from: vi.fn().mockReturnValueOnce(membershipChain) }

    const { result } = renderHook(() =>
      useProjectDocumentAccess({ db, projectId: 'proj-1', schema: 'public' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canManage).toBe(false)
    expect(result.current.isMember).toBe(true)
  })

  it('team_lead is read-only and gets isMember=false when they are NOT on the project', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFetchUserRoleNamesForAuthUser.mockResolvedValue(['team_lead'])
    const usersChain = chainable({ data: { id: 'internal-user-1' } })
    const membershipChain = chainable({ data: null })
    mockPlatformDb.from.mockReturnValueOnce(usersChain)
    const db = { from: vi.fn().mockReturnValueOnce(membershipChain) }

    const { result } = renderHook(() =>
      useProjectDocumentAccess({ db, projectId: 'proj-1', schema: 'public' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canManage).toBe(false)
    expect(result.current.isMember).toBe(false)
  })

  it('sim schema membership check compares against auth.uid() directly (practice_project_memberships.user_id -> auth.users)', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } } })
    mockFetchUserRoleNamesForAuthUser.mockResolvedValue(['team_member'])
    const membershipChain = chainable({ data: { id: 'membership-1' } })
    const simDb = { from: vi.fn().mockReturnValueOnce(membershipChain) }

    const { result } = renderHook(() =>
      useProjectDocumentAccess({ db: simDb, projectId: 'practice-proj-1', schema: 'sim' }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isMember).toBe(true)
    // sim membership uses auth.uid() directly — no platformDb.from('users') lookup needed.
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
    expect(simDb.from).toHaveBeenCalledWith('practice_project_memberships')
  })

  it('no projectId — skips the membership check even for a read-only-tier role', async () => {
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockFetchUserRoleNamesForAuthUser.mockResolvedValue(['team_member'])

    const { result } = renderHook(() => useProjectDocumentAccess({ projectId: null }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canManage).toBe(false)
    expect(result.current.isMember).toBe(true)
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })
})
