// @vitest-environment jsdom
/**
 * Unit test for useRoleScopeGuard's own state-transition wiring (session -> resolveUserRoleScopes
 * -> status). resolveUserRoleScopes()'s classification logic itself is covered separately in
 * utils/__tests__/roleScopeResolution.test.js.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

let mockSession
vi.mock('@nidus/supabase', () => ({
  platformDb: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockSession } }),
    },
  },
}))

let mockScopes
vi.mock('../../utils/menuLayoutUtils', () => ({
  resolveUserRoleScopes: () => Promise.resolve(mockScopes),
}))

const { useRoleScopeGuard } = await import('../useRoleScopeGuard')

describe('useRoleScopeGuard', () => {
  it('stays in loading while there is no session yet', async () => {
    mockSession = null
    const { result } = renderHook(() => useRoleScopeGuard('pmo'))
    await waitFor(() => expect(result.current.status).toBe('loading'))
  })

  it('resolves to allowed once the session user holds the required scope', async () => {
    mockSession = { user: { id: 'u-1' } }
    mockScopes = ['pmo']
    const { result } = renderHook(() => useRoleScopeGuard('pmo'))
    await waitFor(() => expect(result.current.status).toBe('allowed'))
    expect(result.current.scopes).toEqual(['pmo'])
  })

  it('resolves to blocked when the session user does not hold the required scope', async () => {
    mockSession = { user: { id: 'u-2' } }
    mockScopes = ['pm']
    const { result } = renderHook(() => useRoleScopeGuard('pmo'))
    await waitFor(() => expect(result.current.status).toBe('blocked'))
  })

  it('resolves to allowed for a dual-scope user regardless of which scope is required', async () => {
    mockSession = { user: { id: 'u-3' } }
    mockScopes = ['pm', 'pmo']
    const { result } = renderHook(() => useRoleScopeGuard('pmo'))
    await waitFor(() => expect(result.current.status).toBe('allowed'))
  })
})
