import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: (...args) => mockGetUser(...args) },
  },
}))

import { getWorkCategories, createWorkCategory, updateWorkCategory, deleteWorkCategory } from '../timesheetWorkCategoryService'

describe('timesheetWorkCategoryService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
  })

  it('getWorkCategories queries timesheet_work_categories, active by default', async () => {
    const rows = [{ id: '1', code: 'governance', name: 'Governance' }]
    let activeFilterValue
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: (col, val) => {
            activeFilterValue = val
            return {
              order: () => ({
                order: () => Promise.resolve({ data: rows, error: null }),
              }),
            }
          },
        }),
      }),
    })
    const r = await getWorkCategories()
    expect(mockFrom).toHaveBeenCalledWith('timesheet_work_categories')
    expect(activeFilterValue).toBe(true)
    expect(r).toEqual({ success: true, data: rows })
  })

  it('createWorkCategory inserts a new row', async () => {
    const created = { id: 'new', code: 'defect_fixing', name: 'Defect Fixing' }
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: created, error: null }),
        }),
      }),
    })
    const r = await createWorkCategory({ code: 'defect_fixing', name: 'Defect Fixing' })
    expect(r).toEqual({ success: true, data: created })
  })

  it('updateWorkCategory updates the row', async () => {
    const updated = { id: '1', name: 'Governance (v2)' }
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    })
    const r = await updateWorkCategory('1', { name: 'Governance (v2)' })
    expect(r).toEqual({ success: true, data: updated })
  })

  it('deleteWorkCategory soft-deletes the row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const deleted = { id: '1', is_deleted: true }
    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'internal-1' }, error: null }) }) }) }
      }
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: deleted, error: null }),
              }),
            }),
          }),
        }),
      }
    })
    const r = await deleteWorkCategory('1')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_work_categories')
    expect(r).toEqual({ success: true, data: deleted })
  })
})
