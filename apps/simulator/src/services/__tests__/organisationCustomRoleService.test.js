/**
 * Unit tests for organisationCustomRoleService (v902 — Manage Roles / org custom roles)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(),
}))

const { supabase } = await import('../supabase/supabaseClient')
const { getCurrentUserAccountId } = await import('@nidus/shared/utils/accountResolution')
const {
  getManageRolesAccess,
  getCloneSourceRoles,
  getOrgCustomRoles,
  getIndustryCategories,
  getAssignableProjectRoles,
  getRoleById,
  getGrantableMenuItems,
  invalidateGrantableMenuItemsCache,
  createOrgCustomRole,
  updateOrgCustomRole,
  deactivateOrgCustomRole,
  deleteOrgCustomRole,
  isSystemAdmin,
  updateBuiltinRole,
} = await import('../organisationCustomRoleService')

function mockSelectChain(result) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function mockUserLookupChain(userRow) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: userRow, error: null }),
  }
}

function mockSingleChain(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

describe('organisationCustomRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getGrantableMenuItems() caches across calls (v914 perf fix) — each test expects its own
    // fresh mock data, not whatever a previous test's call cached.
    invalidateGrantableMenuItemsCache()
  })

  describe('getManageRolesAccess', () => {
    it('is false with no resolvable account', async () => {
      getCurrentUserAccountId.mockResolvedValue(null)
      const result = await getManageRolesAccess()
      expect(result.canManage).toBe(false)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('calls the same authorization RPC the write paths enforce', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      supabase.from.mockReturnValue(mockUserLookupChain({ id: 'user-1' }))
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await getManageRolesAccess()

      expect(result.canManage).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('user_can_manage_org_roles', {
        p_user_id: 'user-1',
        p_account_id: 'acct-1',
      })
    })
  })

  describe('getCloneSourceRoles', () => {
    it('returns built-in-plus-org roles ordered by level', async () => {
      const rows = [{ id: 'r1', role_name: 'project_manager', account_id: null }]
      supabase.from.mockReturnValue(mockSelectChain({ data: rows, error: null }))

      const result = await getCloneSourceRoles('acct-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(rows)
      expect(supabase.from).toHaveBeenCalledWith('project_roles')
    })

    it('fails fast without an account id', async () => {
      const result = await getCloneSourceRoles(null)
      expect(result.success).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('getOrgCustomRoles', () => {
    it('returns only this organisation’s custom roles', async () => {
      const rows = [{ id: 'r2', role_name: 'site_coordinator', account_id: 'acct-1' }]
      supabase.from.mockReturnValue(mockSelectChain({ data: rows, error: null }))

      const result = await getOrgCustomRoles('acct-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(rows)
    })
  })

  describe('getIndustryCategories', () => {
    it('returns active industry categories ordered by name', async () => {
      const rows = [{ id: 'ic-1', name: 'Construction & Engineering' }]
      supabase.from.mockReturnValue(mockSelectChain({ data: rows, error: null }))

      const result = await getIndustryCategories()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(rows)
      expect(supabase.from).toHaveBeenCalledWith('industry_categories')
    })
  })

  describe('getAssignableProjectRoles (v906/v908 — level-based assignment restriction)', () => {
    it('resolves the account id and calls the RPC with the project scope', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      const rows = [{ id: 'r1', role_name: 'team_manager', role_level: 8 }]
      supabase.rpc.mockResolvedValue({ data: rows, error: null })

      const result = await getAssignableProjectRoles('proj-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(rows)
      expect(supabase.rpc).toHaveBeenCalledWith('get_assignable_project_roles', {
        p_account_id: 'acct-1',
        p_project_id: 'proj-1',
      })
    })

    it('defaults p_project_id to null (caller\'s highest level across all their projects)', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({ data: [], error: null })

      await getAssignableProjectRoles()

      expect(supabase.rpc).toHaveBeenCalledWith('get_assignable_project_roles', {
        p_account_id: 'acct-1',
        p_project_id: null,
      })
    })

    it('fails fast without calling the RPC when the account cannot be resolved', async () => {
      getCurrentUserAccountId.mockResolvedValue(null)

      const result = await getAssignableProjectRoles()

      expect(result.success).toBe(false)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('getRoleById (v910/rule 16.3 — resolves by UUID or friendly role_name)', () => {
    const REAL_UUID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

    it('returns the role for a valid UUID', async () => {
      const row = { id: REAL_UUID, role_name: 'agile_coach', role_display_name: 'Agile Coach' }
      supabase.from.mockReturnValue(mockSingleChain({ data: row, error: null }))

      const result = await getRoleById(REAL_UUID)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(row)
      expect(supabase.from).toHaveBeenCalledWith('project_roles')
    })

    it('resolves a friendly role_name against built-in roles first', async () => {
      const row = { id: REAL_UUID, role_name: 'qa_test_lead', role_display_name: 'QA/Test Lead', account_id: null }
      const chain = mockSingleChain({ data: row, error: null })
      chain.is = vi.fn().mockReturnThis()
      supabase.from.mockReturnValue(chain)

      const result = await getRoleById('qa_test_lead')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(row)
      expect(chain.is).toHaveBeenCalledWith('account_id', null)
      expect(getCurrentUserAccountId).not.toHaveBeenCalled()
    })

    it('falls back to the caller\'s own custom role when no built-in matches the role_name', async () => {
      const customRow = { id: REAL_UUID, role_name: 'site_coordinator', role_display_name: 'Site Coordinator', account_id: 'acct-1' }
      let call = 0
      supabase.from.mockImplementation(() => {
        call += 1
        const isBuiltInLookup = call === 1
        const chain = mockSingleChain({ data: isBuiltInLookup ? null : customRow, error: null })
        chain.is = vi.fn().mockReturnThis()
        return chain
      })
      getCurrentUserAccountId.mockResolvedValue('acct-1')

      const result = await getRoleById('site_coordinator')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(customRow)
      expect(getCurrentUserAccountId).toHaveBeenCalled()
    })

    it('fails fast without a query when no id is given', async () => {
      const result = await getRoleById(null)
      expect(result.success).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('reports not found when the UUID query returns no row', async () => {
      const REAL_UUID_2 = 'ffffffff-ffff-4fff-afff-ffffffffffff'
      supabase.from.mockReturnValue(mockSingleChain({ data: null, error: null }))

      const result = await getRoleById(REAL_UUID_2)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not found/i)
    })
  })

  describe('createOrgCustomRole (v912 — from-scratch is the default; clone kept for reuse)', () => {
    it('from-scratch: resolves the account id and calls the create RPC with level + menu items, no clone source', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({
        data: [{ project_role_id: 'pr-1', role_id: 'r-1' }],
        error: null,
      })

      const result = await createOrgCustomRole({
        displayName: 'Site Coordinator',
        isGovernanceOnly: false,
        roleLevel: 6,
        menuItemIds: ['mi-1', 'mi-2'],
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ projectRoleId: 'pr-1', roleId: 'r-1' })
      expect(supabase.rpc).toHaveBeenCalledWith('create_org_custom_role', {
        p_account_id: 'acct-1',
        p_display_name: 'Site Coordinator',
        p_description: null,
        p_clone_from_project_role_id: null,
        p_is_governance_only: false,
        p_excluded_menu_item_ids: [],
        p_role_level: 6,
        p_menu_item_ids: ['mi-1', 'mi-2'],
      })
    })

    it('defaults roleLevel to 4 and menuItemIds to empty when omitted', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({ data: [{ project_role_id: 'pr-1', role_id: 'r-1' }], error: null })

      await createOrgCustomRole({ displayName: 'Site Coordinator' })

      expect(supabase.rpc).toHaveBeenCalledWith('create_org_custom_role', expect.objectContaining({
        p_clone_from_project_role_id: null,
        p_role_level: 4,
        p_menu_item_ids: [],
      }))
    })

    it('clone mode: still supported when cloneFromProjectRoleId is given (kept for future reuse)', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({
        data: [{ project_role_id: 'pr-1', role_id: 'r-1' }],
        error: null,
      })

      await createOrgCustomRole({
        displayName: 'Site Coordinator',
        cloneFromProjectRoleId: 'source-pr',
        isGovernanceOnly: false,
        excludedMenuItemIds: ['mi-1'],
      })

      expect(supabase.rpc).toHaveBeenCalledWith('create_org_custom_role', {
        p_account_id: 'acct-1',
        p_display_name: 'Site Coordinator',
        p_description: null,
        p_clone_from_project_role_id: 'source-pr',
        p_is_governance_only: false,
        p_excluded_menu_item_ids: ['mi-1'],
        p_role_level: 4,
        p_menu_item_ids: [],
      })
    })

    it('fails without ever calling the RPC when the account cannot be resolved', async () => {
      getCurrentUserAccountId.mockResolvedValue(null)

      const result = await createOrgCustomRole({ displayName: 'Site Coordinator' })

      expect(result.success).toBe(false)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('surfaces the RPC error message (e.g. blocked by authorization check)', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'You do not have permission to create roles for this organisation' },
      })

      const result = await createOrgCustomRole({ displayName: 'Site Coordinator' })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/permission/i)
    })
  })

  describe('getGrantableMenuItems (v912 — from-scratch Create Role picker)', () => {
    it('dedupes menu items granted to any built-in role', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'role-a' }, { id: 'role-b' }], error: null }),
          }
        }
        if (table === 'role_menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) =>
              resolve({
                data: [
                  { menu_item_id: 'mi-1', menu_item: { id: 'mi-1', menu_label: 'Risk Register', route_path: '/risks', is_active: true, is_visible: true } },
                  { menu_item_id: 'mi-1', menu_item: { id: 'mi-1', menu_label: 'Risk Register', route_path: '/risks', is_active: true, is_visible: true } },
                  { menu_item_id: 'mi-2', menu_item: { id: 'mi-2', menu_label: 'Assign Roles', route_path: '/admin/assign-roles', is_active: true, is_visible: true } },
                ],
                error: null,
              }),
          }
        }
        return {}
      })

      const result = await getGrantableMenuItems()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data.map((mi) => mi.id).sort()).toEqual(['mi-1', 'mi-2'])
    })

    it('collapses distinct menu_items rows that share the same label into one entry (legacy menu duplication across layouts/tiers), keeping all underlying ids — even when their routes differ', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'role-a' }], error: null }),
          }
        }
        if (table === 'role_menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) =>
              resolve({
                data: [
                  // Three DIFFERENT menu_items.id rows, same label, DIFFERENT query-string
                  // variants of the route (the real-world case that prompted this) — must still
                  // collapse to one "Agile" checklist row, not three confusing near-duplicates.
                  { menu_item_id: 'agile-sim-portfolio', menu_item: { id: 'agile-sim-portfolio', menu_label: 'Agile', route_path: '/simulator/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=agile', is_active: true, is_visible: true } },
                  { menu_item_id: 'agile-sim-programme', menu_item: { id: 'agile-sim-programme', menu_label: 'Agile', route_path: '/simulator/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=agile', is_active: true, is_visible: true } },
                  { menu_item_id: 'agile-platform', menu_item: { id: 'agile-platform', menu_label: 'Agile', route_path: '/app/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=agile', is_active: true, is_visible: true } },
                  // Category header with no route_path, same label twice — also dedupes by label.
                  { menu_item_id: 'hdr-a', menu_item: { id: 'hdr-a', menu_label: 'Approvals', route_path: null, is_active: true, is_visible: true } },
                  { menu_item_id: 'hdr-b', menu_item: { id: 'hdr-b', menu_label: 'Approvals', route_path: null, is_active: true, is_visible: true } },
                ],
                error: null,
              }),
          }
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [], error: null }),
          }
        }
        return {}
      })

      const result = await getGrantableMenuItems()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      const agile = result.data.find((mi) => mi.menu_label === 'Agile')
      expect(agile.ids.sort()).toEqual(['agile-platform', 'agile-sim-portfolio', 'agile-sim-programme'])
      const approvals = result.data.find((mi) => mi.menu_label === 'Approvals')
      expect(approvals.ids.sort()).toEqual(['hdr-a', 'hdr-b'])
    })

    it('pulls in a section\'s real children directly from menu_items even when the children hang off a DUPLICATE menu_items row sharing the section\'s label that has no grant of its own (v914 — the real "People & Resources" bug: only one of two same-labelled category rows had a built-in role grant, and the children were parented to the OTHER one)', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'role-a' }], error: null }),
          }
        }
        if (table === 'role_menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) =>
              resolve({
                data: [
                  {
                    // This is the ONLY "People & Resources" row granted to a built-in role.
                    menu_item_id: 'people-resources',
                    menu_item: {
                      id: 'people-resources',
                      menu_label: 'People & Resources',
                      route_path: null,
                      parent_menu_id: null,
                      is_active: true,
                      is_visible: true,
                    },
                  },
                ],
                error: null,
              }),
          }
        }
        if (table === 'menu_items') {
          // Three distinct queries hit this table — branch on the column passed to in():
          // 'parent_menu_id' = children-of-a-section fetch, 'menu_label' = re-resolving every
          // duplicate row sharing a granted category's label, 'id' = parent-label lookup.
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn((column) => {
              if (column === 'menu_label') {
                return {
                  is: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  then: (resolve) =>
                    resolve({
                      data: [
                        // The granted row AND the un-granted duplicate the children actually
                        // belong to — both share the "People & Resources" label.
                        { id: 'people-resources', menu_label: 'People & Resources' },
                        { id: 'people-resources-dup', menu_label: 'People & Resources' },
                      ],
                      error: null,
                    }),
                }
              }
              if (column === 'parent_menu_id') {
                return {
                  eq: vi.fn().mockReturnThis(),
                  then: (resolve) =>
                    resolve({
                      data: [
                        {
                          id: 'manager-assignments',
                          menu_label: 'Manager Assignments',
                          route_path: '/admin/manager-assignments',
                          // Parented to the DUPLICATE row, not the one that has the grant.
                          parent_menu_id: 'people-resources-dup',
                          is_active: true,
                          is_visible: true,
                        },
                      ],
                      error: null,
                    }),
                }
              }
              // column === 'id' -> parent-label lookup
              return Promise.resolve({
                data: [{ id: 'people-resources-dup', menu_label: 'People & Resources' }],
                error: null,
              })
            }),
          }
        }
        return {}
      })

      const result = await getGrantableMenuItems()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      const child = result.data.find((mi) => mi.menu_label === 'Manager Assignments')
      expect(child).toBeTruthy()
      expect(child.category).toBe('People & Resources')
      expect(child.isCategory).toBe(false)
      const section = result.data.find((mi) => mi.menu_label === 'People & Resources')
      expect(section.isCategory).toBe(true)
    })

    it('returns an empty list without querying role_menu_items when there are no built-in roles', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await getGrantableMenuItems()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('caches a successful result so a second call within the TTL does not re-query the DB (v914 perf fix — Create Role/Bundle bounced between repeatedly in one sitting)', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'role-a' }], error: null }),
          }
        }
        if (table === 'role_menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) =>
              resolve({
                data: [
                  { menu_item_id: 'mi-1', menu_item: { id: 'mi-1', menu_label: 'Risk Register', route_path: '/risks', is_active: true, is_visible: true } },
                ],
                error: null,
              }),
          }
        }
        return {}
      })

      const first = await getGrantableMenuItems()
      const callsAfterFirst = supabase.from.mock.calls.length
      const second = await getGrantableMenuItems()

      expect(first.data).toEqual(second.data)
      expect(supabase.from.mock.calls.length).toBe(callsAfterFirst)
    })

    it('invalidateGrantableMenuItemsCache() forces the next call to re-query', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'role-a' }], error: null }),
          }
        }
        if (table === 'role_menu_items') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [], error: null }),
          }
        }
        return {}
      })

      await getGrantableMenuItems()
      const callsAfterFirst = supabase.from.mock.calls.length
      invalidateGrantableMenuItemsCache()
      await getGrantableMenuItems()

      expect(supabase.from.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })
  })

  describe('updateOrgCustomRole', () => {
    it('calls the update RPC with the given fields', async () => {
      supabase.rpc.mockResolvedValue({ error: null })

      const result = await updateOrgCustomRole({
        projectRoleId: 'pr-1',
        displayName: 'Site Lead',
        isGovernanceOnly: true,
        addMenuItemIds: ['mi-2'],
        removeMenuItemIds: ['mi-3'],
      })

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('update_org_custom_role', {
        p_project_role_id: 'pr-1',
        p_display_name: 'Site Lead',
        p_description: null,
        p_is_governance_only: true,
        p_add_menu_item_ids: ['mi-2'],
        p_remove_menu_item_ids: ['mi-3'],
      })
    })
  })

  describe('deactivateOrgCustomRole / deleteOrgCustomRole', () => {
    it('calls deactivate RPC', async () => {
      supabase.rpc.mockResolvedValue({ error: null })
      const result = await deactivateOrgCustomRole('pr-1')
      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_org_custom_role', { p_project_role_id: 'pr-1' })
    })

    it('surfaces the in-use blocking message from delete RPC', async () => {
      supabase.rpc.mockResolvedValue({
        error: { message: 'Cannot delete: role is currently assigned to 3 member(s). Reassign them or deactivate the role instead.' },
      })
      const result = await deleteOrgCustomRole('pr-1')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/currently assigned to 3 member/i)
    })
  })

  describe('isSystemAdmin (v910 — System Role Catalog gate)', () => {
    it('returns true when is_system_admin_user RPC returns true', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      supabase.from.mockReturnValue(mockUserLookupChain({ id: 'user-1' }))
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await isSystemAdmin()

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('is_system_admin_user', { p_user_id: 'user-1' })
    })

    it('returns false without calling the RPC when there is no session', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await isSystemAdmin()

      expect(result).toBe(false)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('returns false when the RPC returns false (e.g. a pmo_admin, not system_admin)', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      supabase.from.mockReturnValue(mockUserLookupChain({ id: 'user-1' }))
      supabase.rpc.mockResolvedValue({ data: false, error: null })

      const result = await isSystemAdmin()

      expect(result).toBe(false)
    })
  })

  describe('updateBuiltinRole (v910 — system_admin-only built-in edit)', () => {
    it('calls the RPC with the full field set and never sends role_name', async () => {
      supabase.rpc.mockResolvedValue({ error: null })

      const result = await updateBuiltinRole({
        projectRoleId: 'pr-1',
        displayName: 'Agile Coach',
        description: 'Updated description',
        roleLevel: 8,
        industryCategoryId: 'ic-1',
        isGovernanceOnly: false,
        addMenuItemIds: ['mi-1'],
        removeMenuItemIds: ['mi-2'],
      })

      expect(result.success).toBe(true)
      const call = supabase.rpc.mock.calls[0]
      expect(call[0]).toBe('update_builtin_role')
      expect(call[1]).toEqual({
        p_project_role_id: 'pr-1',
        p_display_name: 'Agile Coach',
        p_description: 'Updated description',
        p_role_level: 8,
        p_industry_category_id: 'ic-1',
        p_is_governance_only: false,
        p_add_menu_item_ids: ['mi-1'],
        p_remove_menu_item_ids: ['mi-2'],
      })
      expect(call[1]).not.toHaveProperty('p_role_name')
    })

    it('surfaces the authorization error for a non-system-admin caller', async () => {
      supabase.rpc.mockResolvedValue({
        error: { message: 'Only system administrators can edit the built-in role catalog' },
      })

      const result = await updateBuiltinRole({
        projectRoleId: 'pr-1',
        displayName: 'Agile Coach',
        roleLevel: 8,
        isGovernanceOnly: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/system administrators/i)
    })
  })
})
