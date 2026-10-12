import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPlatformDb } = vi.hoisted(() => ({
  mockPlatformDb: { auth: { getSession: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))

const { mockClearSidebarCache } = vi.hoisted(() => ({ mockClearSidebarCache: vi.fn() }))
vi.mock('../menuCacheUtils', () => ({ clearSidebarCache: mockClearSidebarCache }))

import {
  isValidAccountId,
  getCurrentUserInternalUserId,
  resolveAccountIdForAuthUser,
  getAccessibleWorkspaces,
  setActiveWorkspace,
} from '../accountResolution'

/** A Supabase-query-builder-shaped stub: every method returns itself, and it's
 * thenable so `await` resolves at whichever point the code stops chaining. */
function chainable(result) {
  const obj = {}
  const methods = ['select', 'eq', 'maybeSingle', 'update', 'limit', 'not']
  methods.forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

describe('accountResolution', () => {
  describe('isValidAccountId', () => {
    it('rejects null, undefined, empty, and literal "null"', () => {
      expect(isValidAccountId(null)).toBe(false)
      expect(isValidAccountId(undefined)).toBe(false)
      expect(isValidAccountId('')).toBe(false)
      expect(isValidAccountId('null')).toBe(false)
    })

    it('accepts a valid UUID', () => {
      expect(isValidAccountId('42a1c47a-c1bf-4ea3-a78c-cd278270458d')).toBe(true)
    })
  })

  describe('getCurrentUserInternalUserId', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockPlatformDb.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'auth-1', email: 'pat@example.com' } } },
      })
      mockPlatformDb.from.mockReturnValue(chainable({ data: { id: 'user-row-1' }, error: null }))
    })

    it('resolves the internal user id', async () => {
      expect(await getCurrentUserInternalUserId()).toBe('user-row-1')
    })

    it('de-dupes concurrent calls into a single underlying users query — this function is', async () => {
      // called independently by many components mounted on the same page (header,
      // profile sections, project context, ...); overlapping calls should share one
      // in-flight request rather than each firing their own identical query.
      const [a, b, c] = await Promise.all([
        getCurrentUserInternalUserId(),
        getCurrentUserInternalUserId(),
        getCurrentUserInternalUserId(),
      ])
      expect(a).toBe('user-row-1')
      expect(b).toBe('user-row-1')
      expect(c).toBe('user-row-1')
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(1)
    })

    it('is not a persistent cache — a later call after the first resolves runs fresh', async () => {
      await getCurrentUserInternalUserId()
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(1)

      await getCurrentUserInternalUserId()
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(2)
    })
  })

  // ==========================================================================
  // v982 Phase 4 — Workspace Switching
  // ==========================================================================

  describe('resolveAccountIdForAuthUser — single-org regression (rule: zero behaviour change)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      sessionStorage.clear()
    })

    it('a user who has never switched (last_active_account_id NULL) resolves via the exact pre-v995 owner waterfall, unchanged', async () => {
      mockPlatformDb.from.mockImplementation((table) => {
        if (table === 'users') return chainable({ data: { last_active_account_id: null }, error: null })
        if (table === 'accounts') return chainable({ data: { id: 'owned-account-1' }, error: null })
        throw new Error(`Unexpected table in this test: ${table}`)
      })

      const result = await resolveAccountIdForAuthUser('auth-1', 'internal-user-1')

      expect(result).toBe('owned-account-1')
      // proves the last_active_account_id check ran (users table hit) but changed nothing —
      // resolution still lands on the SAME account the pre-v995 waterfall would have found.
      expect(mockPlatformDb.from).toHaveBeenCalledWith('users')
      expect(mockPlatformDb.from).toHaveBeenCalledWith('accounts')
    })

    it('the session cache still wins first, exactly as before v995 (no extra query at all when cached)', async () => {
      sessionStorage.setItem('nidus:acct:auth-1', '42a1c47a-c1bf-4ea3-a78c-cd278270458d')

      const result = await resolveAccountIdForAuthUser('auth-1', 'internal-user-1')

      expect(result).toBe('42a1c47a-c1bf-4ea3-a78c-cd278270458d')
      expect(mockPlatformDb.from).not.toHaveBeenCalled()
    })
  })

  describe('resolveAccountIdForAuthUser — active workspace selection takes priority', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      sessionStorage.clear()
    })

    it('uses last_active_account_id when set, without falling through to the owner/invite/project waterfall', async () => {
      mockPlatformDb.from.mockImplementation((table) => {
        if (table === 'users') return chainable({ data: { last_active_account_id: 'switched-to-account-2' }, error: null })
        throw new Error(`Waterfall should not run when last_active_account_id is set — unexpected table: ${table}`)
      })

      const result = await resolveAccountIdForAuthUser('auth-1', 'internal-user-1')

      expect(result).toBe('switched-to-account-2')
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(1)
      expect(mockPlatformDb.from).toHaveBeenCalledWith('users')
    })
  })

  describe('getAccessibleWorkspaces', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockPlatformDb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } })
    })

    it('returns every workspace get_user_accounts() returns for a multi-org user, not just the first', async () => {
      const rows = [
        { account_id: 'acct-owned', account_name: 'My Own Org', is_owner: true, total_members: 3 },
        { account_id: 'acct-member-1', account_name: 'Client Org A', is_owner: false, total_members: 12 },
        { account_id: 'acct-member-2', account_name: 'Client Org B', is_owner: false, total_members: 5 },
      ]
      mockPlatformDb.rpc.mockResolvedValue({ data: rows, error: null })

      const res = await getAccessibleWorkspaces()

      expect(res.success).toBe(true)
      expect(res.data).toHaveLength(3)
      expect(res.data.map((r) => r.account_id)).toEqual(['acct-owned', 'acct-member-1', 'acct-member-2'])
    })

    it('returns an empty list (not an error) for an unauthenticated caller', async () => {
      mockPlatformDb.auth.getSession.mockResolvedValue({ data: { session: null } })
      const res = await getAccessibleWorkspaces()
      expect(res.success).toBe(true)
      expect(res.data).toEqual([])
    })
  })

  describe('setActiveWorkspace — the zero-stale-cache-leakage guarantee', () => {
    const VALID_TARGET = '42a1c47a-c1bf-4ea3-a78c-cd278270458d'

    beforeEach(() => {
      vi.clearAllMocks()
      sessionStorage.clear()
      mockPlatformDb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } })
      mockPlatformDb.from.mockImplementation((table) => {
        if (table === 'users') return chainable({ data: { id: 'internal-user-1' }, error: null })
        throw new Error(`Unexpected table: ${table}`)
      })
    })

    it('rejects an invalid/malformed workspace id without touching the database', async () => {
      const res = await setActiveWorkspace('not-a-uuid')
      expect(res.success).toBe(false)
      expect(mockPlatformDb.from).not.toHaveBeenCalled()
      expect(mockClearSidebarCache).not.toHaveBeenCalled()
    })

    it('persists the new selection, overwrites the session cache immediately, AND clears the sidebar cache for this user — the single most important assertion in this phase', async () => {
      // Simulate workspace A's account id already cached in-session (as if the user had been
      // resolved into workspace A earlier this session) — this is exactly the state a switch
      // must overwrite, not just supplement.
      sessionStorage.setItem('nidus:acct:auth-1', 'workspace-A-account-id')

      const res = await setActiveWorkspace(VALID_TARGET)

      expect(res.success).toBe(true)
      // 1. persisted server-side (users.last_active_account_id)
      expect(mockPlatformDb.from).toHaveBeenCalledWith('users')
      // 2. session cache now holds ONLY the new workspace — workspace A's id is gone
      expect(sessionStorage.getItem('nidus:acct:auth-1')).toBe(VALID_TARGET)
      expect(sessionStorage.getItem('nidus:acct:auth-1')).not.toBe('workspace-A-account-id')
      // 3. sidebar cache wipe was invoked for this user — the mechanism this whole phase exists
      //    to guarantee, since the sidebar cache key has no account_id component of its own
      //    (see menuCacheUtils.js) and would otherwise keep serving workspace A's "fresh" (<10
      //    min) cached sidebar under the same key after the switch.
      expect(mockClearSidebarCache).toHaveBeenCalledWith('auth-1')
      expect(mockClearSidebarCache).toHaveBeenCalledTimes(1)
    })

    it('a subsequent resolveAccountIdForAuthUser call immediately after switching returns the NEW workspace, never the old cached one', async () => {
      sessionStorage.setItem('nidus:acct:auth-1', 'workspace-A-account-id')
      await setActiveWorkspace(VALID_TARGET)

      // resolveAccountIdForAuthUser checks the session cache FIRST — after setActiveWorkspace
      // has overwritten it, this must resolve the new workspace, not workspace A, and must do so
      // WITHOUT hitting the database again (the whole point of overwriting the cache immediately
      // rather than merely clearing it).
      mockPlatformDb.from.mockClear()
      const resolved = await resolveAccountIdForAuthUser('auth-1', 'internal-user-1')

      expect(resolved).toBe(VALID_TARGET)
      expect(resolved).not.toBe('workspace-A-account-id')
      expect(mockPlatformDb.from).not.toHaveBeenCalled()
    })

    it('fails gracefully when not authenticated', async () => {
      mockPlatformDb.auth.getSession.mockResolvedValue({ data: { session: null } })
      const res = await setActiveWorkspace(VALID_TARGET)
      expect(res.success).toBe(false)
      expect(mockClearSidebarCache).not.toHaveBeenCalled()
    })
  })
})
