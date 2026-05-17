import { describe, it, expect, vi, beforeEach } from 'vitest'

const platformFrom = vi.fn()
const simFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...a) => platformFrom(...a) },
  simDb: { from: (...a) => simFrom(...a) },
}))

import {
  resolveProjectId,
  resolveRiskId,
  resolveScenarioId,
  getProjectCode,
} from '../entityResolverService.js'

function mockMaybeSingleRow(table, row) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }
}

describe('entityResolverService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    platformFrom.mockReset()
    simFrom.mockReset()
  })

  it('resolveProjectId returns UUID input without querying', async () => {
    const id = 'e550e840-e29b-41d4-a716-446655440000'
    await expect(resolveProjectId(id)).resolves.toBe(id)
    expect(platformFrom).not.toHaveBeenCalled()
  })

  it('resolveProjectId looks up by project_code', async () => {
    const uuid = 'e550e840-e29b-41d4-a716-446655440000'
    platformFrom.mockImplementation(() =>
      mockMaybeSingleRow('projects', { id: uuid }),
    )
    await expect(resolveProjectId('PRJ-0001')).resolves.toBe(uuid)
    expect(platformFrom).toHaveBeenCalledWith('projects')
  })

  it('resolveRiskId requires project context', async () => {
    await expect(resolveRiskId('RISK-1', '')).resolves.toBe(null)
  })

  it('resolveRiskId resolves code with project UUID', async () => {
    const rid = 'b550e840-e29b-41d4-a716-446655440001'
    const pid = 'e550e840-e29b-41d4-a716-446655440000'
    platformFrom.mockImplementation(() =>
      mockMaybeSingleRow('risks', { id: rid }),
    )
    await expect(resolveRiskId('RISK-0001', pid)).resolves.toBe(rid)
  })

  it('resolveScenarioId queries sim.scenarios', async () => {
    const sid = 'c550e840-e29b-41d4-a716-446655440002'
    simFrom.mockImplementation(() =>
      mockMaybeSingleRow('scenarios', { id: sid }),
    )
    await expect(resolveScenarioId('SCN-0001')).resolves.toBe(sid)
    expect(simFrom).toHaveBeenCalledWith('scenarios')
  })

  it('getProjectCode fetches code for UUID', async () => {
    platformFrom.mockImplementation(() =>
      mockMaybeSingleRow('projects', { project_code: 'PRJ-0007' }),
    )
    await expect(
      getProjectCode('e550e840-e29b-41d4-a716-446655440000'),
    ).resolves.toBe('PRJ-0007')
  })
})
