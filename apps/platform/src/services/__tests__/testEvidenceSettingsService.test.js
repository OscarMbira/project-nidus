import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getOrganisationTestEvidenceDefault,
  setOrganisationTestEvidenceDefault,
  getProjectTestEvidenceRequirement,
  setProjectTestEvidenceRequirement,
} from '../testEvidenceSettingsService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn() },
}))

function chain(result) {
  return {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
}

describe('testEvidenceSettingsService (PRD v1204, Slice 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the organisation default from accounts', async () => {
    const c = chain({ data: { test_evidence_default: 'required' }, error: null })
    platformDb.from.mockReturnValue(c)

    const out = await getOrganisationTestEvidenceDefault('acc-1')

    expect(platformDb.from).toHaveBeenCalledWith('accounts')
    expect(c.eq).toHaveBeenCalledWith('id', 'acc-1')
    expect(out).toBe('required')
  })

  it('writes only an allowed organisation default', async () => {
    const c = chain({ data: { id: 'acc-1' }, error: null })
    platformDb.from.mockReturnValue(c)

    await setOrganisationTestEvidenceDefault('acc-1', 'required')

    expect(c.update).toHaveBeenCalledWith({ test_evidence_default: 'required' })
    await expect(setOrganisationTestEvidenceDefault('acc-1', 'maybe')).rejects.toThrow()
  })

  it('reads the project override, where null means inherit', async () => {
    const c = chain({ data: { test_evidence_requirement: null }, error: null })
    platformDb.from.mockReturnValue(c)

    const out = await getProjectTestEvidenceRequirement('proj-1')

    expect(platformDb.from).toHaveBeenCalledWith('projects')
    expect(out).toBeNull()
  })

  it('writes a project override, and clears it with null', async () => {
    const c = chain({ data: { id: 'proj-1' }, error: null })
    platformDb.from.mockReturnValue(c)

    await setProjectTestEvidenceRequirement('proj-1', 'optional')
    expect(c.update).toHaveBeenLastCalledWith({ test_evidence_requirement: 'optional' })

    await setProjectTestEvidenceRequirement('proj-1', null)
    expect(c.update).toHaveBeenLastCalledWith({ test_evidence_requirement: null })
  })
})
