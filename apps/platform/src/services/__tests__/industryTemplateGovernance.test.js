/**
 * Unit + integration-style tests for industryTemplateService's v982 Phase 2 governance
 * extension: getTemplateGovernanceProfiles / saveTemplateGovernanceProfile /
 * provisionTemplateGovernanceForProject (the "creating a project from a classified template
 * auto-provisions its governance" behaviour — PRD Phase 2 testing decision).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn() },
}))
vi.mock('@nidus/shared/services/pmTemplateInheritanceService.js', () => ({
  resolveEffectiveDocumentMaster: vi.fn(),
}))

const { platformDb } = await import('../supabase/supabaseClient')
const {
  getTemplateGovernanceProfiles,
  provisionTemplateGovernanceForProject,
} = await import('../industryTemplateService')

function chainFor(table, handlers) {
  // handlers: array of fns, each returning what that call in sequence should resolve to
  let call = 0
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(handlers[call++]())),
    maybeSingle: vi.fn(() => Promise.resolve(handlers[call++]())),
    insert: vi.fn(() => Promise.resolve(handlers[call++]())),
  }
  return chain
}

describe('industryTemplateService — template governance (v982 Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplateGovernanceProfiles', () => {
    it('returns [] without hitting the DB when account or template id is missing', async () => {
      const res = await getTemplateGovernanceProfiles(null, 'tpl-1')
      expect(res).toEqual([])
      expect(platformDb.from).not.toHaveBeenCalled()
    })

    it('scopes the query to account_id + template_id', async () => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve({ data: [{ id: 'g1', account_id: 'acct-A', template_id: 'tpl-1' }], error: null })),
      }
      platformDb.from.mockReturnValue(chain)
      const res = await getTemplateGovernanceProfiles('acct-A', 'tpl-1')
      expect(res).toHaveLength(1)
      expect(chain.eq).toHaveBeenCalledWith('account_id', 'acct-A')
      expect(chain.eq).toHaveBeenCalledWith('template_id', 'tpl-1')
    })
  })

  describe('provisionTemplateGovernanceForProject — auto-provisioning trigger', () => {
    function mockScenario({ project, governanceProfiles, existingGateNames = [] }) {
      platformDb.from.mockImplementation((table) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: project, error: null })),
          }
        }
        if (table === 'pmo_industry_template_governance') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn(() => Promise.resolve({ data: governanceProfiles, error: null })),
          }
        }
        if (table === 'stage_gate_reviews') {
          // .select('gate_name').eq('project_id', ...).eq('is_deleted', false) — the second .eq()
          // call is the one that resolves with the existing-gates result; insert() is separate.
          const chain = {}
          chain.select = vi.fn(() => chain)
          chain.eq = vi.fn()
            .mockReturnValueOnce(chain)
            .mockReturnValueOnce(Promise.resolve({ data: existingGateNames.map((gate_name) => ({ gate_name })), error: null }))
          chain.insert = vi.fn(() => Promise.resolve({ error: null }))
          return chain
        }
        throw new Error(`Unexpected table: ${table}`)
      })
    }

    it('provisions exactly the declared stage gates, no more/fewer', async () => {
      mockScenario({
        project: { id: 'proj-1', account_id: 'acct-A', classification_id: null },
        governanceProfiles: [
          { id: 'g1', account_id: 'acct-A', template_id: 'tpl-1', classification_id: null, required_stage_gate_names: ['Initiation Gate', 'Design Gate'], is_active: true },
        ],
        existingGateNames: [],
      })

      const result = await provisionTemplateGovernanceForProject('proj-1', 'tpl-1', 'user-1')

      expect(result.provisioned.sort()).toEqual(['Design Gate', 'Initiation Gate'])
      expect(result.skipped).toEqual([])
      const stageGateCalls = platformDb.from.mock.results.filter((_, i) => platformDb.from.mock.calls[i][0] === 'stage_gate_reviews')
      const insertedChain = stageGateCalls[stageGateCalls.length - 1].value
      expect(insertedChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ project_id: 'proj-1', gate_name: 'Initiation Gate', status: 'draft' }),
        expect.objectContaining({ project_id: 'proj-1', gate_name: 'Design Gate', status: 'draft' }),
      ])
    })

    it('is idempotent — never duplicates a gate that already exists for the project', async () => {
      mockScenario({
        project: { id: 'proj-1', account_id: 'acct-A', classification_id: null },
        governanceProfiles: [
          { id: 'g1', account_id: 'acct-A', template_id: 'tpl-1', classification_id: null, required_stage_gate_names: ['Initiation Gate', 'Design Gate'], is_active: true },
        ],
        existingGateNames: ['Initiation Gate'],
      })

      const result = await provisionTemplateGovernanceForProject('proj-1', 'tpl-1', 'user-1')

      expect(result.provisioned).toEqual(['Design Gate'])
      expect(result.skipped).toEqual(['Initiation Gate'])
    })

    it('a classification-specific profile overrides the account default', async () => {
      mockScenario({
        project: { id: 'proj-1', account_id: 'acct-A', classification_id: 'class-strategic' },
        governanceProfiles: [
          { id: 'g-default', account_id: 'acct-A', template_id: 'tpl-1', classification_id: null, required_stage_gate_names: ['Default Gate'], is_active: true },
          { id: 'g-override', account_id: 'acct-A', template_id: 'tpl-1', classification_id: 'class-strategic', required_stage_gate_names: ['Strategic Gate 1', 'Strategic Gate 2'], is_active: true },
        ],
        existingGateNames: [],
      })

      const result = await provisionTemplateGovernanceForProject('proj-1', 'tpl-1', 'user-1')

      expect(result.provisioned.sort()).toEqual(['Strategic Gate 1', 'Strategic Gate 2'])
    })

    it('provisions nothing when no governance profile is defined for the template', async () => {
      mockScenario({
        project: { id: 'proj-1', account_id: 'acct-A', classification_id: null },
        governanceProfiles: [],
        existingGateNames: [],
      })

      const result = await provisionTemplateGovernanceForProject('proj-1', 'tpl-1', 'user-1')

      expect(result).toEqual({ provisioned: [], skipped: [] })
    })

    it('returns immediately when projectId or templateId is missing', async () => {
      const result = await provisionTemplateGovernanceForProject(null, 'tpl-1', 'user-1')
      expect(result).toEqual({ provisioned: [], skipped: [] })
      expect(platformDb.from).not.toHaveBeenCalled()
    })
  })
})
