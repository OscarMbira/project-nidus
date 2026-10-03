/**
 * Assumptions Register service tests (v963 Phase 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase } = vi.hoisted(() => {
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
    mockSupabase: {
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })) },
      from: vi.fn(() => makeBuilder({ data: { id: 'user-1' }, error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }))
vi.mock('../riskService', () => ({ createRisk: vi.fn(() => Promise.resolve({ success: true, data: { id: 'risk-1' } })) }))
vi.mock('../issueService', () => ({ createIssue: vi.fn(() => Promise.resolve({ id: 'issue-1' })) }))
vi.mock('../issueRegisterService', () => ({ getOrCreateIssueRegister: vi.fn(() => Promise.resolve({ id: 'register-1' })) }))

import {
  listAssumptions,
  getAssumption,
  createAssumption,
  updateAssumption,
  deleteAssumption,
  convertAssumptionToRisk,
  convertAssumptionToIssue,
} from '../assumptionService'

describe('assumptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listAssumptions returns [] when no projectId is given', async () => {
    const result = await listAssumptions(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listAssumptions queries the assumptions table for a project', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: [{ id: 'a1', assumption_text: 'x' }], error: null })
    )
    const result = await listAssumptions('project-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('assumptions')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getAssumption returns a single record', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: { id: 'a1', assumption_text: 'x' }, error: null })
    )
    const result = await getAssumption('a1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('a1')
  })

  it('createAssumption resolves the current user and inserts a row', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'a1' }, error: null })) // insert
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'a1', assumption_code: 'ASM-2026-001', assumption_description: 'Some assumption' }, error: null })) // re-read after ID trigger

    const result = await createAssumption({ projectId: 'project-1', assumptionText: 'Some assumption' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('a1')
    expect(result.data.assumption_code).toBe('ASM-2026-001')
  })

  it('createAssumption surfaces an error when insert fails', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: { message: 'insert failed' } }))

    const result = await createAssumption({ projectId: 'project-1', assumptionText: 'Bad' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insert failed/)
  })

  it('updateAssumption resolves user then updates', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await updateAssumption('a1', { validationStatus: 'validated' })
    expect(result.success).toBe(true)
  })

  it('deleteAssumption soft-deletes via is_deleted flag', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await deleteAssumption('a1')
    expect(result.success).toBe(true)
  })

  it('convertAssumptionToRisk creates a risk and links converted_to_risk_id', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null })) // user lookup inside updateAssumption
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null })) // update

    const result = await convertAssumptionToRisk('a1', 'project-1', 'Some assumption text')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('risk-1')
  })

  it('convertAssumptionToIssue creates an issue and links converted_to_issue_id', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await convertAssumptionToIssue('a1', 'project-1', 'Some assumption text')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('issue-1')
  })
})
