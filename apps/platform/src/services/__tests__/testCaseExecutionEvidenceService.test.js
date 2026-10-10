import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listEvidenceForRun,
  listEvidenceForProject,
  uploadExecutionEvidence,
  softDeleteExecutionEvidence,
  getEvidenceRequirementSettings,
  filterEvidenceByOutcome,
  flattenEvidenceRow,
  EVIDENCE_BUCKET,
} from '../testCaseExecutionEvidenceService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn(), storage: { from: vi.fn() } },
}))

vi.mock('@nidus/shared/utils/resolveInternalUserId', () => ({
  resolveInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

function chain(result) {
  const c = {
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
  return c
}

describe('testCaseExecutionEvidenceService (PRD v1204, Slice 1–2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only live (not soft-deleted) evidence for a run', async () => {
    const rows = [{ id: 'e1', file_name: 'proof.png' }]
    const c = chain({ data: rows, error: null })
    platformDb.from.mockReturnValue(c)

    const out = await listEvidenceForRun('run-1')

    expect(platformDb.from).toHaveBeenCalledWith('test_case_execution_evidence')
    expect(c.eq).toHaveBeenCalledWith('run_id', 'run-1')
    expect(c.is).toHaveBeenCalledWith('deleted_at', null)
    expect(out).toEqual(rows)
  })

  it('lists live evidence for a project with the test case, run and defect context', async () => {
    const c = chain({ data: [], error: null })
    platformDb.from.mockReturnValue(c)

    await listEvidenceForProject('proj-1')

    expect(c.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    expect(c.is).toHaveBeenCalledWith('deleted_at', null)
    const selectArg = c.select.mock.calls[0][0]
    expect(selectArg).toContain('test_case_ref')
    expect(selectArg).toContain('defect_ref')
    expect(selectArg).toContain('run_name')
    expect(selectArg).toContain('uploaded_by')
    expect(selectArg).toContain('run:test_runs!run_id ( run_name, status )')
  })

  it('filters evidence rows by outcome, defaulting to all rows for "all"', () => {
    const rows = [
      { id: 'a', execution: { status: 'passed' } },
      { id: 'b', execution: { status: 'failed' } },
      { id: 'c', execution: { status: 'blocked' } },
    ]
    expect(filterEvidenceByOutcome(rows, 'passed').map((r) => r.id)).toEqual(['a'])
    expect(filterEvidenceByOutcome(rows, 'failed').map((r) => r.id)).toEqual(['b'])
    expect(filterEvidenceByOutcome(rows, 'all').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('flattens a joined evidence row into the columns the page and export use', () => {
    const flat = flattenEvidenceRow({
      id: 'ev-9',
      file_name: 'Login_screen.png',
      mime_type: 'image/png',
      created_at: '2026-10-04T10:00:00Z',
      storage_path: 'executions/exec-1/1-Login.png',
      uploaded_by: 'user-9',
      uploader: { full_name: 'Oscar Mbira' },
      run: { run_name: 'Sprint 3', status: 'in_progress' },
      execution: {
        status: 'failed',
        test_case: { test_case_ref: 'TC-001', title: 'Login works' },
        defect: { id: 'd-1', defect_ref: 'DEF-0001' },
      },
    })
    expect(flat).toMatchObject({
      id: 'ev-9',
      testCaseRef: 'TC-001',
      testCaseTitle: 'Login works',
      runName: 'Sprint 3',
      runStatus: 'in_progress',
      outcome: 'failed',
      fileName: 'Login_screen.png',
      mimeType: 'image/png',
      uploadedBy: 'Oscar Mbira',
      uploadedById: 'user-9',
      defectId: 'd-1',
      defectRef: 'DEF-0001',
      storagePath: 'executions/exec-1/1-Login.png',
    })
  })

  it('uploads a file to the evidence bucket and records it against the execution', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null })
    platformDb.storage.from.mockReturnValue({ upload })
    const c = chain({ data: { id: 'e2' }, error: null })
    platformDb.from.mockReturnValue(c)

    const file = new File(['abc'], 'Login screen.png', { type: 'image/png' })
    await uploadExecutionEvidence({ executionId: 'exec-1', runId: 'run-1', projectId: 'proj-1', file })

    expect(platformDb.storage.from).toHaveBeenCalledWith(EVIDENCE_BUCKET)
    const [path] = upload.mock.calls[0]
    expect(path.startsWith('executions/exec-1/')).toBe(true)
    expect(path.endsWith('Login_screen.png')).toBe(true)

    const inserted = c.insert.mock.calls[0][0]
    expect(inserted).toMatchObject({
      test_case_execution_id: 'exec-1',
      run_id: 'run-1',
      project_id: 'proj-1',
      file_name: 'Login screen.png',
      mime_type: 'image/png',
      file_size: 3,
      uploaded_by: 'user-1',
      storage_bucket: EVIDENCE_BUCKET,
    })
  })

  it('soft deletes evidence by setting deleted_at and deleted_by, never removing the row', async () => {
    const c = chain({ data: { id: 'e3' }, error: null })
    platformDb.from.mockReturnValue(c)

    await softDeleteExecutionEvidence('e3')

    expect(platformDb.from).toHaveBeenCalledWith('test_case_execution_evidence')
    const patch = c.update.mock.calls[0][0]
    expect(patch.deleted_at).toBeTruthy()
    expect(patch.deleted_by).toBe('user-1')
    expect(c.eq).toHaveBeenCalledWith('id', 'e3')
  })

  it('reads the project override and the organisation default for the requirement setting', async () => {
    const projectChain = chain({ data: { test_evidence_requirement: null, account_id: 'acc-1' }, error: null })
    const accountChain = chain({ data: { test_evidence_default: 'required' }, error: null })
    platformDb.from.mockImplementation((table) => {
      if (table === 'projects') return projectChain
      if (table === 'accounts') return accountChain
      throw new Error(`unexpected table ${table}`)
    })

    const out = await getEvidenceRequirementSettings('proj-1')

    expect(out).toEqual({ projectValue: null, accountDefault: 'required' })
    expect(accountChain.eq).toHaveBeenCalledWith('id', 'acc-1')
  })
})
