import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPracticeExecutionsByRun, updatePracticeExecution } from '../practiceTestRunService'
import { simDb } from '../../supabase/supabaseClient'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: { from: vi.fn() },
}))

describe('practiceTestRunService — defect embed disambiguation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // practice_test_case_executions and practice_defects have two FKs between
  // them (defect_id, and practice_defects.execution_id) — an unhinted embed
  // is ambiguous (PGRST201: "more than one relationship was found").
  it('getPracticeExecutionsByRun disambiguates the defect embed', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    simDb.from.mockReturnValue(chain)

    await getPracticeExecutionsByRun('run-1')

    expect(chain.select.mock.calls[0][0]).toContain('practice_defects!defect_id')
  })

  it('updatePracticeExecution disambiguates the defect embed', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null }),
    }
    simDb.from.mockReturnValue(chain)

    await updatePracticeExecution('e1', { status: 'failed' })

    expect(chain.select.mock.calls[0][0]).toContain('practice_defects!defect_id')
  })
})
