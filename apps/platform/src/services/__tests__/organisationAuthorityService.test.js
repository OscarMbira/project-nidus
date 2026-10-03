/**
 * Unit tests for organisationAuthorityService (v982 Phase 2 — PMO Configuration Zone)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(),
}))
vi.mock('../roleService', () => ({ getUserSystemRoles: vi.fn() }))

const { platformDb } = await import('@nidus/supabase')
const { getCurrentUserAccountId } = await import('@nidus/shared/utils/accountResolution')
const {
  getOrganisationAuthorities,
  createOrganisationAuthority,
  updateOrganisationAuthority,
  deleteOrganisationAuthority,
} = await import('../organisationAuthorityService')

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

describe('organisationAuthorityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.auth.getUser.mockResolvedValue({ data: { user: null } })
  })

  it('getOrganisationAuthorities scopes by account_id', async () => {
    const chain = makeChain({ data: [{ id: 'a1', account_id: 'acct-A' }], error: null })
    platformDb.from.mockReturnValue(chain)
    const res = await getOrganisationAuthorities('acct-A')
    expect(res.success).toBe(true)
    expect(chain.eq).toHaveBeenCalledWith('account_id', 'acct-A')
  })

  it('rejects a max_amount below min_amount on create', async () => {
    getCurrentUserAccountId.mockResolvedValue('acct-A')
    const res = await createOrganisationAuthority({ authority_name: 'Bad band', min_amount: 1000, max_amount: 100 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/greater than or equal/i)
    expect(platformDb.from).not.toHaveBeenCalled()
  })

  it('accepts a null max_amount (no upper limit)', async () => {
    getCurrentUserAccountId.mockResolvedValue('acct-A')
    const chain = makeChain({ data: { id: 'a1' }, error: null })
    platformDb.from.mockReturnValue(chain)
    const res = await createOrganisationAuthority({ authority_name: 'Unlimited', min_amount: 0, max_amount: '' })
    expect(res.success).toBe(true)
  })

  it('rejects a max_amount below min_amount on update', async () => {
    const res = await updateOrganisationAuthority('a1', { min_amount: 500, max_amount: 10 })
    expect(res.success).toBe(false)
  })

  it('delete soft-deletes', async () => {
    const chain = { update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) }
    platformDb.from.mockReturnValue(chain)
    const res = await deleteOrganisationAuthority('a1')
    expect(res.success).toBe(true)
  })
})
