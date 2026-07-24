import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTestRuns,
  getExecutionsByRun,
  updateExecution,
  getRunStats,
} from '../testRunService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn() },
}))

describe('testRunService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getTestRuns returns rows', async () => {
    const rows = [{ id: 'r1', run_name: 'Sprint 1' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestRuns('proj-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('test_runs')
  })

  it('getExecutionsByRun returns ordered list', async () => {
    const rows = [{ id: 'e1', status: 'pending' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getExecutionsByRun('run-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('test_case_executions')
  })

  it('updateExecution sets executed_at for non-pending status and returns defect embed', async () => {
    const returned = {
      id: 'e1',
      status: 'failed',
      defect: { id: 'd1', defect_ref: 'DEF-001', title: 'Bug', severity: 'high', status: 'new' },
    }
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returned, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await updateExecution('e1', { status: 'failed' })
    expect(out.defect?.defect_ref).toBe('DEF-001')
    expect(chain.update).toHaveBeenCalled()
    const updArg = chain.update.mock.calls[0][0]
    expect(updArg.executed_at).toBeDefined()
  })

  it('getRunStats returns limited rows', async () => {
    const data = [{ status: 'completed', summary: {}, run_date: '2026-03-01' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getRunStats('p1')
    expect(out).toEqual(data)
  })
})
