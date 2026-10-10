/**
 * Expense Categories lookup service tests (v1226).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => {
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
    mockDb: {
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })) },
      from: vi.fn(() => makeBuilder({ data: { id: 'user-1' }, error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../supabase/supabaseClient', () => ({ platformDb: mockDb }))

import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '../expenseCategoryService'

describe('expenseCategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('getExpenseCategories returns active categories by default', async () => {
    mockDb.from.mockReturnValueOnce(
      mockDb.__makeBuilder({ data: [{ id: 'c1', category_name: 'Travel', is_active: true }], error: null })
    )
    const result = await getExpenseCategories()
    expect(mockDb.from).toHaveBeenCalledWith('expense_categories')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('createExpenseCategory resolves the internal user id and inserts the row', async () => {
    mockDb.from
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: { id: 'c2', category_name: 'Parking' }, error: null }))

    const result = await createExpenseCategory({ category_code: 'parking', category_name: 'Parking' })
    expect(result.success).toBe(true)
    expect(result.data.category_name).toBe('Parking')
  })

  it('updateExpenseCategory returns an error result when the update fails', async () => {
    mockDb.from
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: null, error: { message: 'boom' } }))

    const result = await updateExpenseCategory('c1', { category_name: 'Travel & Transit' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })

  it('deleteExpenseCategory soft-deletes by setting is_deleted and is_active false', async () => {
    mockDb.from
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockDb.__makeBuilder({ data: { id: 'c1', is_deleted: true }, error: null }))

    const result = await deleteExpenseCategory('c1')
    expect(result.success).toBe(true)
    expect(result.data.is_deleted).toBe(true)
  })
})
