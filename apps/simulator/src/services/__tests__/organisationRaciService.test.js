/**
 * Unit tests for organisationRaciService (v982 Phase 2 — PMO Configuration Zone)
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
  getRoleResponsibilities,
  createRoleResponsibility,
  updateRoleResponsibility,
  deleteRoleResponsibility,
} = await import('../organisationRaciService')

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return chain
}

describe('organisationRaciService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.auth.getUser.mockResolvedValue({ data: { user: null } })
  })

  it('getRoleResponsibilities scopes by account_id', async () => {
    const chain = makeChain({ data: [{ id: 'r1', account_id: 'acct-A', raci_code: 'R' }], error: null })
    platformDb.from.mockReturnValue(chain)
    const res = await getRoleResponsibilities('acct-A')
    expect(res.success).toBe(true)
    expect(chain.eq).toHaveBeenCalledWith('account_id', 'acct-A')
  })

  it('create requires a resolvable account id', async () => {
    getCurrentUserAccountId.mockResolvedValue(null)
    const res = await createRoleResponsibility({ record_type: 'risks', role_name: 'project_manager', raci_code: 'A' })
    expect(res.success).toBe(false)
  })

  it('create inserts the RACI row with trimmed fields', async () => {
    getCurrentUserAccountId.mockResolvedValue('acct-A')
    const chain = makeChain({ data: { id: 'r1' }, error: null })
    platformDb.from.mockReturnValue(chain)
    const res = await createRoleResponsibility({ record_type: '  risks  ', role_name: ' project_manager ', raci_code: 'A' })
    expect(res.success).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ record_type: 'risks', role_name: 'project_manager', raci_code: 'A' }),
    ])
  })

  it('update requires an id', async () => {
    const res = await updateRoleResponsibility(null, {})
    expect(res.success).toBe(false)
  })

  it('delete soft-deletes', async () => {
    const chain = { update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) }
    platformDb.from.mockReturnValue(chain)
    const res = await deleteRoleResponsibility('r1')
    expect(res.success).toBe(true)
  })
})
