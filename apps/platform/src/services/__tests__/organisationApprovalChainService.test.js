/**
 * Unit tests for organisationApprovalChainService (v982 Phase 2 — PMO Configuration Zone)
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
  getApprovalChainTemplates,
  createApprovalChainTemplate,
} = await import('../organisationApprovalChainService')

describe('organisationApprovalChainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.auth.getUser.mockResolvedValue({ data: { user: null } })
  })

  it('getApprovalChainTemplates scopes by account_id', async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve({ data: [{ id: 't1', account_id: 'acct-A' }], error: null })),
    }
    platformDb.from.mockReturnValue(chain)
    const res = await getApprovalChainTemplates('acct-A')
    expect(res.success).toBe(true)
    expect(chain.eq).toHaveBeenCalledWith('account_id', 'acct-A')
  })

  it('createApprovalChainTemplate creates the chain then replaces its steps in order', async () => {
    getCurrentUserAccountId.mockResolvedValue('acct-A')
    const templateChain = {
      insert: vi.fn(() => templateChain),
      select: vi.fn(() => templateChain),
      single: vi.fn(() => Promise.resolve({ data: { id: 'chain-1', chain_name: 'Standard' }, error: null })),
    }
    const stepsDeleteChain = { delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) }
    const stepsInsertChain = { insert: vi.fn(() => Promise.resolve({ error: null })) }
    let stepsCallCount = 0
    platformDb.from.mockImplementation((table) => {
      if (table === 'pmo_approval_chain_templates') return templateChain
      // pmo_approval_chain_steps: first call is delete (replaceSteps), second is insert
      stepsCallCount += 1
      return stepsCallCount === 1 ? stepsDeleteChain : stepsInsertChain
    })

    const res = await createApprovalChainTemplate({
      chain_name: 'Standard',
      steps: [
        { role_name: 'project_manager', approval_level: 1 },
        { role_name: 'pmo_admin', approval_level: 2 },
        { role_name: '   ', approval_level: 3 }, // blank role names are dropped
      ],
    })

    expect(res.success).toBe(true)
    expect(stepsInsertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ chain_template_id: 'chain-1', step_order: 1, role_name: 'project_manager' }),
      expect.objectContaining({ chain_template_id: 'chain-1', step_order: 2, role_name: 'pmo_admin' }),
    ])
  })
})
