/**
 * Assumptions Register service tests (Simulator, v963 Phase 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSimDb } = vi.hoisted(() => {
  function makeBuilder(result) {
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => Promise.resolve(result)),
      single: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: (resolve) => Promise.resolve(result).then(resolve),
    }
    return builder
  }
  return {
    mockSimDb: {
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })) },
      from: vi.fn(() => makeBuilder({ data: { id: 'user-1' }, error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../supabaseClient', () => ({ simDb: mockSimDb }))

import {
  listAssumptions,
  getAssumption,
  createAssumption,
  updateAssumption,
  deleteAssumption,
  convertAssumptionToRisk,
  convertAssumptionToIssue,
} from '../assumptionService'

describe('assumptionService (Simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listAssumptions returns [] when no projectId is given', async () => {
    const result = await listAssumptions(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listAssumptions queries the assumptions table for a practice project', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: [{ id: 'a1', assumption_text: 'x' }], error: null })
    )
    const result = await listAssumptions('practice-project-1')
    expect(mockSimDb.from).toHaveBeenCalledWith('assumptions')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getAssumption returns a single record', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: { id: 'a1', assumption_text: 'x' }, error: null })
    )
    const result = await getAssumption('a1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('a1')
  })

  it('createAssumption resolves the current user and inserts a row', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'a1' }, error: null })) // insert
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'a1', assumption_code: 'SASM-2026-001' }, error: null })) // re-read after ID trigger

    const result = await createAssumption({ projectId: 'practice-project-1', assumptionText: 'Some assumption' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('a1')
    expect(result.data.assumption_code).toBe('SASM-2026-001')
  })

  it('updateAssumption updates the row', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await updateAssumption('a1', { validationStatus: 'validated' })
    expect(result.success).toBe(true)
  })

  it('deleteAssumption soft-deletes via is_deleted flag', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await deleteAssumption('a1')
    expect(result.success).toBe(true)
  })

  it('convertAssumptionToRisk inserts into practice_risks and links the assumption', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'risk-1' }, error: null })) // practice_risks insert
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null })) // update assumption

    const result = await convertAssumptionToRisk('a1', 'practice-project-1', 'Some assumption text')
    expect(mockSimDb.from).toHaveBeenCalledWith('practice_risks')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('risk-1')
  })

  it('convertAssumptionToIssue inserts into practice_issues and links the assumption', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'issue-1' }, error: null })) // practice_issues insert
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null })) // update assumption

    const result = await convertAssumptionToIssue('a1', 'practice-project-1', 'Some assumption text')
    expect(mockSimDb.from).toHaveBeenCalledWith('practice_issues')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('issue-1')
  })
})
