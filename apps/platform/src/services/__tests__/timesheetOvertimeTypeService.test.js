import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
    auth: { getUser: (...args) => mockGetUser(...args) },
  },
}))

import {
  getOvertimeTypes,
  createOvertimeType,
  updateOvertimeType,
  deleteOvertimeType,
} from '../timesheetOvertimeTypeService'

describe('timesheetOvertimeTypeService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
  })

  it('getOvertimeTypes queries timesheet_overtime_types, active by default', async () => {
    const rows = [{ id: '1', code: 'after_hours', name: 'After Hours' }]
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
    const r = await getOvertimeTypes()
    expect(mockFrom).toHaveBeenCalledWith('timesheet_overtime_types')
    expect(activeFilterValue).toBe(true)
    expect(r).toEqual({ success: true, data: rows })
  })

  it('createOvertimeType inserts a new row with is_system forced false', async () => {
    const created = { id: 'new', code: 'public_holiday', name: 'Public Holiday', is_system: false }
    let insertPayload
    mockFrom.mockReturnValue({
      insert: (payload) => {
        insertPayload = payload
        return {
          select: () => ({
            single: () => Promise.resolve({ data: created, error: null }),
          }),
        }
      },
    })
    const r = await createOvertimeType({ code: 'public_holiday', name: 'Public Holiday' })
    expect(insertPayload.is_system).toBe(false)
    expect(r).toEqual({ success: true, data: created })
  })

  it('updateOvertimeType cannot update a system row (is_system=false filter)', async () => {
    const updated = { id: '1', name: 'After Hours (v2)' }
    let eqCalls = []
    mockFrom.mockReturnValue({
      update: () => ({
        eq: (col, val) => {
          eqCalls.push([col, val])
          return {
            eq: (col2, val2) => {
              eqCalls.push([col2, val2])
              return {
                eq: (col3, val3) => {
                  eqCalls.push([col3, val3])
                  return {
                    select: () => ({
                      single: () => Promise.resolve({ data: updated, error: null }),
                    }),
                  }
                },
              }
            },
          }
        },
      }),
    })
    const r = await updateOvertimeType('1', { name: 'After Hours (v2)' })
    expect(eqCalls).toContainEqual(['is_system', false])
    expect(r).toEqual({ success: true, data: updated })
  })

  it('deleteOvertimeType soft-deletes and cannot delete a system row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const deleted = { id: '1', is_deleted: true }
    let eqCalls = []
    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'internal-1' }, error: null }) }) }) }
      }
      return {
        update: () => ({
          eq: (col, val) => {
            eqCalls.push([col, val])
            return {
              eq: (col2, val2) => {
                eqCalls.push([col2, val2])
                return {
                  eq: (col3, val3) => {
                    eqCalls.push([col3, val3])
                    return {
                      select: () => ({
                        single: () => Promise.resolve({ data: deleted, error: null }),
                      }),
                    }
                  },
                }
              },
            }
          },
        }),
      }
    })
    const r = await deleteOvertimeType('1')
    expect(mockFrom).toHaveBeenCalledWith('timesheet_overtime_types')
    expect(eqCalls).toContainEqual(['is_system', false])
    expect(r).toEqual({ success: true, data: deleted })
  })
})
