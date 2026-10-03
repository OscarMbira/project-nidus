/**
 * Constraints Register service tests (v1100). Mirrors assumptionService.test.js's pattern.
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

import {
  listConstraints,
  getConstraint,
  createConstraint,
  updateConstraint,
  deleteConstraint,
} from '../constraintService'

describe('constraintService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listConstraints returns [] when no projectId is given', async () => {
    const result = await listConstraints(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listConstraints queries the constraints_register table for a project', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: [{ id: 'c1', constraint_text: 'x' }], error: null })
    )
    const result = await listConstraints('project-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('constraints_register')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getConstraint returns a single record', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: { id: 'c1', constraint_text: 'x' }, error: null })
    )
    const result = await getConstraint('c1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('c1')
  })

  it('createConstraint resolves the current user and inserts a row', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'c1' }, error: null })) // insert

    const result = await createConstraint({ projectId: 'project-1', constraintText: 'Must launch by Q3' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('c1')
  })

  it('createConstraint surfaces an error when insert fails', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: { message: 'insert failed' } }))

    const result = await createConstraint({ projectId: 'project-1', constraintText: 'Bad' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insert failed/)
  })

  it('updateConstraint resolves user then updates', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await updateConstraint('c1', { status: 'managed' })
    expect(result.success).toBe(true)
  })

  it('deleteConstraint soft-deletes via is_deleted flag', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await deleteConstraint('c1')
    expect(result.success).toBe(true)
  })
})
