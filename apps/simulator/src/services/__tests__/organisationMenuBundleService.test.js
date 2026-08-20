/**
 * Unit tests for organisationMenuBundleService (v914 — Menu Bundles)
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
  getOrgMenuBundles,
  getMenuBundleById,
  createOrgMenuBundle,
  updateOrgMenuBundle,
  deleteOrgMenuBundle,
} = await import('../organisationMenuBundleService')

function mockSelectChain(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
}

function mockSingleChain(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

describe('organisationMenuBundleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrgMenuBundles', () => {
    it('returns this organisation\'s active bundles, alphabetical, with each item count flattened', async () => {
      const rows = [
        {
          id: 'b1',
          bundle_name: 'Field Team Access',
          account_id: 'acct-1',
          bundle_items: [{ count: 3 }],
        },
      ]
      supabase.from.mockReturnValue(mockSelectChain({ data: rows, error: null }))

      const result = await getOrgMenuBundles('acct-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([
        { id: 'b1', bundle_name: 'Field Team Access', account_id: 'acct-1', itemCount: 3 },
      ])
      expect(supabase.from).toHaveBeenCalledWith('org_menu_bundles')
    })

    it('fails fast without an account id', async () => {
      const result = await getOrgMenuBundles(null)
      expect(result.success).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('getMenuBundleById', () => {
    const REAL_UUID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

    it('returns the bundle + its item ids for a valid UUID', async () => {
      const bundleRow = { id: REAL_UUID, bundle_name: 'Field Team Access', account_id: 'acct-1' }
      let call = 0
      supabase.from.mockImplementation((table) => {
        call += 1
        if (table === 'org_menu_bundles') {
          return mockSingleChain({ data: bundleRow, error: null })
        }
        // org_menu_bundle_items
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ menu_item_id: 'mi-1' }, { menu_item_id: 'mi-2' }],
            error: null,
          }),
        }
      })

      const result = await getMenuBundleById(REAL_UUID)

      expect(result.success).toBe(true)
      expect(result.data.bundle_name).toBe('Field Team Access')
      expect(result.data.menuItemIds).toEqual(['mi-1', 'mi-2'])
    })

    it('resolves a friendly bundle_name case-insensitively within the caller\'s own account', async () => {
      const bundleRow = { id: REAL_UUID, bundle_name: 'Field Team Access', account_id: 'acct-1' }
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((...args) => {
          // First eq('account_id', ...) chains; second eq('is_active', true) resolves.
          if (args[0] === 'account_id') return { eq: vi.fn().mockResolvedValue({ data: [bundleRow], error: null }) }
          return Promise.resolve({ data: [bundleRow], error: null })
        }),
      })

      const result = await getMenuBundleById('field team access')

      expect(result.success).toBe(true)
      expect(result.data.id).toBe(REAL_UUID)
    })

    it('returns not-found for a bundle_name that does not match any bundle in the account', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      })

      const result = await getMenuBundleById('does-not-exist')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Menu bundle not found')
    })

    it('skips its own account resolution when the caller already knows the account id (perf: avoids a redundant concurrent resolution chain alongside getManageRolesAccess)', async () => {
      const bundleRow = { id: REAL_UUID, bundle_name: 'Field Team Access', account_id: 'acct-1' }
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((...args) => {
          if (args[0] === 'account_id') return { eq: vi.fn().mockResolvedValue({ data: [bundleRow], error: null }) }
          return Promise.resolve({ data: [bundleRow], error: null })
        }),
      })

      const result = await getMenuBundleById('field team access', 'acct-1')

      expect(result.success).toBe(true)
      expect(getCurrentUserAccountId).not.toHaveBeenCalled()
    })
  })

  describe('createOrgMenuBundle', () => {
    it('resolves the account id and calls the create RPC', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-1')
      supabase.rpc.mockResolvedValue({ data: 'new-bundle-id', error: null })

      const result = await createOrgMenuBundle({
        bundleName: 'Field Team Access',
        description: 'Standard field team sidebar access',
        menuItemIds: ['mi-1', 'mi-2'],
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ bundleId: 'new-bundle-id' })
      expect(supabase.rpc).toHaveBeenCalledWith('create_org_menu_bundle', {
        p_account_id: 'acct-1',
        p_bundle_name: 'Field Team Access',
        p_description: 'Standard field team sidebar access',
        p_menu_item_ids: ['mi-1', 'mi-2'],
      })
    })

    it('fails fast without calling the RPC when the account cannot be resolved', async () => {
      getCurrentUserAccountId.mockResolvedValue(null)

      const result = await createOrgMenuBundle({ bundleName: 'Field Team Access' })

      expect(result.success).toBe(false)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('updateOrgMenuBundle', () => {
    it('calls the update RPC with full-replace item ids', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await updateOrgMenuBundle({
        bundleId: 'b1',
        bundleName: 'Field Team Access v2',
        description: null,
        menuItemIds: ['mi-3'],
      })

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('update_org_menu_bundle', {
        p_bundle_id: 'b1',
        p_bundle_name: 'Field Team Access v2',
        p_description: null,
        p_menu_item_ids: ['mi-3'],
      })
    })
  })

  describe('deleteOrgMenuBundle', () => {
    it('calls the soft-delete RPC', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await deleteOrgMenuBundle('b1')

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('delete_org_menu_bundle', { p_bundle_id: 'b1' })
    })

    it('surfaces an RPC error', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'not permitted' } })

      const result = await deleteOrgMenuBundle('b1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('not permitted')
    })
  })
})
