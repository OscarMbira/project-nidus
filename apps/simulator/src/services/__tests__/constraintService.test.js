/**
 * Constraints Register service tests (Simulator, v1100). Mirrors assumptionService.test.js.
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
  listConstraints,
  getConstraint,
  createConstraint,
  updateConstraint,
  deleteConstraint,
} from '../constraintService'

describe('constraintService (Simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listConstraints returns [] when no projectId is given', async () => {
    const result = await listConstraints(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listConstraints queries the practice_constraints table for a practice project', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: [{ id: 'c1', constraint_text: 'x' }], error: null })
    )
    const result = await listConstraints('practice-project-1')
    expect(mockSimDb.from).toHaveBeenCalledWith('practice_constraints')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getConstraint returns a single record', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: { id: 'c1', constraint_text: 'x' }, error: null })
    )
    const result = await getConstraint('c1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('c1')
  })

  it('createConstraint resolves the current user and inserts a row', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'c1' }, error: null })) // insert

    const result = await createConstraint({ projectId: 'practice-project-1', constraintText: 'Must launch by Q3' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('c1')
  })

  it('updateConstraint updates the row', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await updateConstraint('c1', { status: 'managed' })
    expect(result.success).toBe(true)
  })

  it('deleteConstraint soft-deletes via is_deleted flag', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await deleteConstraint('c1')
    expect(result.success).toBe(true)
  })
})
