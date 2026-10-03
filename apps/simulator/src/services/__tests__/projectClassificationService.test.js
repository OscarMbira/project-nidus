/**
 * Unit tests for projectClassificationService (v982 Phase 2 — PMO Configuration Zone)
 * Includes the mandatory cross-tenant isolation contract test (PRD Phase 2 testing decisions):
 * every read/write call this service makes must be scoped to the caller's own account_id.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(),
}))
vi.mock('../roleService', () => ({
  getUserSystemRoles: vi.fn(),
}))

const { platformDb } = await import('@nidus/supabase')
const { getCurrentUserAccountId } = await import('@nidus/shared/utils/accountResolution')
const { getUserSystemRoles } = await import('../roleService')
const {
  getPmoConfigAccess,
  getProjectClassifications,
  createProjectClassification,
  updateProjectClassification,
  deleteProjectClassification,
} = await import('../projectClassificationService')

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return chain
}

describe('projectClassificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPmoConfigAccess', () => {
    it('resolves accountId and canManage from system roles', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-A')
      platformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'pmo_admin' } }] })

      const res = await getPmoConfigAccess()
      expect(res).toEqual({ success: true, accountId: 'acct-A', canManage: true, error: null })
    })

    it('canManage is false for a non-PMO role', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-A')
      platformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
      getUserSystemRoles.mockResolvedValue({ success: true, data: [{ roles: { role_name: 'team_member' } }] })

      const res = await getPmoConfigAccess()
      expect(res.canManage).toBe(false)
    })

    it('returns no account when the caller has none', async () => {
      getCurrentUserAccountId.mockResolvedValue(null)
      const res = await getPmoConfigAccess()
      expect(res.accountId).toBeNull()
      expect(res.canManage).toBe(false)
    })
  })

  describe('getProjectClassifications — cross-tenant isolation contract', () => {
    it('scopes the query to the given account_id only', async () => {
      const chain = makeChain({ data: [{ id: 'c1', account_id: 'acct-A', classification_name: 'Standard' }], error: null })
      platformDb.from.mockReturnValue(chain)

      const res = await getProjectClassifications('acct-A')

      expect(res.success).toBe(true)
      expect(platformDb.from).toHaveBeenCalledWith('project_classifications')
      expect(chain.eq).toHaveBeenCalledWith('account_id', 'acct-A')
      // never leaks a different account's id into the same query
      expect(chain.eq).not.toHaveBeenCalledWith('account_id', 'acct-B')
    })

    it('a second, independent call for a different account uses its own account_id, never the first call\'s', async () => {
      const chainA = makeChain({ data: [{ id: 'c1', account_id: 'acct-A' }], error: null })
      const chainB = makeChain({ data: [{ id: 'c2', account_id: 'acct-B' }], error: null })
      platformDb.from.mockReturnValueOnce(chainA).mockReturnValueOnce(chainB)

      const resA = await getProjectClassifications('acct-A')
      const resB = await getProjectClassifications('acct-B')

      expect(chainA.eq).toHaveBeenCalledWith('account_id', 'acct-A')
      expect(chainB.eq).toHaveBeenCalledWith('account_id', 'acct-B')
      expect(resA.data.every((r) => r.account_id === 'acct-A')).toBe(true)
      expect(resB.data.every((r) => r.account_id === 'acct-B')).toBe(true)
    })

    it('fails fast without an account id rather than querying unscoped', async () => {
      const res = await getProjectClassifications(null)
      expect(res.success).toBe(false)
      expect(platformDb.from).not.toHaveBeenCalled()
    })
  })

  describe('createProjectClassification', () => {
    it('inserts with the resolved account_id and uppercased code', async () => {
      getCurrentUserAccountId.mockResolvedValue('acct-A')
      platformDb.auth.getUser.mockResolvedValue({ data: { user: null } })
      const chain = makeChain({ data: { id: 'new-1', account_id: 'acct-A', classification_code: 'STD', classification_name: 'Standard' }, error: null })
      platformDb.from.mockReturnValue(chain)

      const res = await createProjectClassification({ account_id: 'acct-A', classification_code: 'std', classification_name: 'Standard' })

      expect(res.success).toBe(true)
      expect(chain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ account_id: 'acct-A', classification_code: 'STD', classification_name: 'Standard' }),
      ])
    })
  })

  describe('updateProjectClassification / deleteProjectClassification', () => {
    it('update requires an id', async () => {
      const res = await updateProjectClassification(null, {})
      expect(res.success).toBe(false)
    })

    it('delete soft-deletes (is_deleted true) rather than removing the row', async () => {
      const chain = makeChain({ data: null, error: null })
      chain.update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
      platformDb.from.mockReturnValue(chain)

      const res = await deleteProjectClassification('c1')
      expect(res.success).toBe(true)
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true, is_active: false }))
    })
  })
})
