import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listEvidenceForRun,
  uploadPracticeExecutionEvidence,
  softDeletePracticeExecutionEvidence,
  getPracticeEvidenceRequirementSettings,
  PRACTICE_EVIDENCE_BUCKET,
} from '../practiceTestCaseExecutionEvidenceService'
import { simDb } from '../../supabase/supabaseClient'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: { from: vi.fn(), storage: { from: vi.fn() } },
}))

vi.mock('../../../utils/resolveSimInternalUserId', () => ({
  resolveSimInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

function chain(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
}

describe('practiceTestCaseExecutionEvidenceService (Simulator, PRD v1204 parity)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only live evidence for a practice run from the sim table', async () => {
    const rows = [{ id: 'e1' }]
    const c = chain({ data: rows, error: null })
    simDb.from.mockReturnValue(c)

    const out = await listEvidenceForRun('run-1')

    expect(simDb.from).toHaveBeenCalledWith('practice_test_case_execution_evidence')
    expect(c.eq).toHaveBeenCalledWith('run_id', 'run-1')
    expect(c.is).toHaveBeenCalledWith('deleted_at', null)
    expect(out).toEqual(rows)
  })

  it('uploads to the evidence bucket and records the file against the practice execution', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null })
    simDb.storage.from.mockReturnValue({ upload })
    const c = chain({ data: { id: 'e2' }, error: null })
    simDb.from.mockReturnValue(c)

    const file = new File(['abc'], 'Checkout page.png', { type: 'image/png' })
    await uploadPracticeExecutionEvidence({ executionId: 'exec-1', runId: 'run-1', practiceProjectId: 'pp-1', file })

    expect(simDb.storage.from).toHaveBeenCalledWith(PRACTICE_EVIDENCE_BUCKET)
    expect(upload.mock.calls[0][0].startsWith('practice/executions/exec-1/')).toBe(true)
    expect(c.insert.mock.calls[0][0]).toMatchObject({
      practice_test_case_execution_id: 'exec-1',
      run_id: 'run-1',
      practice_project_id: 'pp-1',
      file_name: 'Checkout page.png',
      uploaded_by: 'user-1',
    })
  })

  it('soft deletes by stamping deleted_at and deleted_by', async () => {
    const c = chain({ data: { id: 'e3' }, error: null })
    simDb.from.mockReturnValue(c)

    await softDeletePracticeExecutionEvidence('e3')

    const patch = c.update.mock.calls[0][0]
    expect(patch.deleted_at).toBeTruthy()
    expect(patch.deleted_by).toBe('user-1')
    expect(c.eq).toHaveBeenCalledWith('id', 'e3')
  })

  it('reads the practice project override for the requirement setting', async () => {
    const c = chain({ data: { test_evidence_requirement: 'required', user_id: 'owner-1' }, error: null })
    simDb.from.mockReturnValue(c)

    const out = await getPracticeEvidenceRequirementSettings('pp-1')

    expect(simDb.from).toHaveBeenCalledWith('practice_projects')
    expect(out).toEqual({ projectValue: 'required', accountDefault: null, ownerUserId: 'owner-1' })
  })
})
