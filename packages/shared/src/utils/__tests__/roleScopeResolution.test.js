/**
 * Unit tests for the v839 role-scope resolution helpers: fetchUserRoleNamesForAuthUser,
 * resolveUserRoleScopes, userHasAnyRole. These back the RoleScopeGate/useRoleScopeGuard fix for
 * the PM->PMO sidebar-switch bug, plus the RequireRole/userHasAnyRole fine-grained admin gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Chainable + thenable mock: every builder method returns `this` so any call order works, and
// the object itself resolves via `.then()` to whichever canned response is queued next for that
// table — mirrors how supabase-js's PostgrestFilterBuilder can be awaited at any chain point.
function makeSupabaseMock(responsesByTable) {
  const from = vi.fn((table) => {
    const queue = responsesByTable[table] || []
    const response = queue.shift() || { data: null, error: null }
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => Promise.resolve(response),
      then: (resolve) => resolve(response),
    }
    return builder
  })
  return { from }
}

let mockPlatformDb

vi.mock('@nidus/supabase', () => ({
  get platformDb() {
    return mockPlatformDb
  },
}))

const { fetchUserRoleNamesForAuthUser, resolveUserRoleScopes, userHasAnyRole, clearCachedUserMenuRoles } =
  await import('../menuLayoutUtils')

const AUTH_USER = { id: 'auth-user-1' }

describe('fetchUserRoleNamesForAuthUser', () => {
  beforeEach(() => {
    clearCachedUserMenuRoles()
  })

  it('returns [] when auth user has no id', async () => {
    expect(await fetchUserRoleNamesForAuthUser(null)).toEqual([])
    expect(await fetchUserRoleNamesForAuthUser({})).toEqual([])
  })

  it('returns [] when the users row is not found', async () => {
    mockPlatformDb = makeSupabaseMock({ users: [{ data: null, error: null }] })
    expect(await fetchUserRoleNamesForAuthUser(AUTH_USER)).toEqual([])
  })

  it('returns [] when the user has no active role rows', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-1' }, error: null }],
      user_roles: [{ data: [], error: null }],
    })
    expect(await fetchUserRoleNamesForAuthUser(AUTH_USER)).toEqual([])
  })

  it('resolves role names, excluding soft-deleted assignments', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-1' }, error: null }],
      user_roles: [
        {
          data: [
            { role_id: 'r1', is_active: true, is_deleted: false },
            { role_id: 'r2', is_active: true, is_deleted: true },
          ],
          error: null,
        },
      ],
      roles: [{ data: [{ role_name: 'project_manager' }], error: null }],
    })
    expect(await fetchUserRoleNamesForAuthUser(AUTH_USER)).toEqual(['project_manager'])
  })
})

describe('resolveUserRoleScopes', () => {
  beforeEach(() => {
    clearCachedUserMenuRoles()
  })

  it('returns [] for no auth user', async () => {
    expect(await resolveUserRoleScopes(null)).toEqual([])
  })

  it('classifies a PM-only role as pm scope', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-1' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'project_manager' }], error: null }],
    })
    expect(await resolveUserRoleScopes({ id: 'u-pm' })).toEqual(['pm'])
  })

  it('classifies a PMO-only role as pmo scope', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-2' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'pmo_admin' }], error: null }],
    })
    expect(await resolveUserRoleScopes({ id: 'u-pmo' })).toEqual(['pmo'])
  })

  it('returns both scopes for a dual-role user — this is the "never block a dual-role user" case', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-3' }, error: null }],
      user_roles: [
        {
          data: [
            { role_id: 'r1', is_active: true, is_deleted: false },
            { role_id: 'r2', is_active: true, is_deleted: false },
          ],
          error: null,
        },
      ],
      roles: [{ data: [{ role_name: 'pmo_admin' }, { role_name: 'project_manager' }], error: null }],
    })
    const scopes = await resolveUserRoleScopes({ id: 'u-dual' })
    expect(scopes.sort()).toEqual(['pm', 'pmo'])
  })

  it('returns [] for a user with roles that map to no scope', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-4' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'some_unrelated_role' }], error: null }],
    })
    expect(await resolveUserRoleScopes({ id: 'u-none' })).toEqual([])
  })

  it('is cache-first — a second call for the same user does not hit the DB again', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-5' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'project_manager' }], error: null }],
    })
    const user = { id: 'u-cache' }
    expect(await resolveUserRoleScopes(user)).toEqual(['pm'])
    // Second call: queues are now empty, so a real DB hit would resolve to the {data:null} default —
    // getting ['pm'] again proves the cache (not a second query) served this call.
    expect(await resolveUserRoleScopes(user)).toEqual(['pm'])
  })
})

describe('userHasAnyRole', () => {
  beforeEach(() => {
    clearCachedUserMenuRoles()
  })

  it('returns false with no auth user or no role names to check', async () => {
    expect(await userHasAnyRole(null, ['pmo_admin'])).toBe(false)
    expect(await userHasAnyRole({ id: 'x' }, [])).toBe(false)
  })

  it('matches the fine-grained pmo-suite-admin set (pmo_admin/org_admin/system_admin/super_admin)', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-6' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'org_admin' }], error: null }],
    })
    expect(
      await userHasAnyRole({ id: 'u-org-admin' }, ['pmo_admin', 'org_admin', 'system_admin', 'super_admin']),
    ).toBe(true)
  })

  it('does not match account_owner against the narrower pmo-suite-admin set', async () => {
    mockPlatformDb = makeSupabaseMock({
      users: [{ data: { id: 'internal-7' }, error: null }],
      user_roles: [{ data: [{ role_id: 'r1', is_active: true, is_deleted: false }], error: null }],
      roles: [{ data: [{ role_name: 'account_owner' }], error: null }],
    })
    expect(
      await userHasAnyRole({ id: 'u-owner' }, ['pmo_admin', 'org_admin', 'system_admin', 'super_admin']),
    ).toBe(false)
  })
})
