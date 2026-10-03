import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
vi.mock('@nidus/supabase', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

import {
  listDeliverables,
  createDeliverable,
  softDeleteDeliverable,
} from '../deliverableRegisterService'

function chain(result) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    order: vi.fn(() => api),
    insert: vi.fn(() => api),
    update: vi.fn(() => api),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: undefined,
  }
  api.eq.mockReturnValue(api)
  api.order.mockImplementation(async () => result)
  api.select.mockReturnValue(api)
  api.insert.mockReturnValue(api)
  api.update.mockReturnValue(api)
  return api
}

describe('deliverableRegisterService', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('listDeliverables queries deliverable_register for a project', async () => {
    const api = chain({ data: [{ id: '1', title: 'A' }], error: null })
    api.order = vi.fn(async () => ({ data: [{ id: '1', title: 'A' }], error: null }))
    fromMock.mockReturnValue(api)
    const res = await listDeliverables('proj-1')
    expect(fromMock).toHaveBeenCalledWith('deliverable_register')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
  })

  it('createDeliverable inserts with blank display_id', async () => {
    const api = chain({ data: { id: 'd1', title: 'Ship', display_id: '' }, error: null })
    fromMock.mockReturnValue(api)
    const res = await createDeliverable('proj-1', { title: 'Ship' }, 'user-1')
    expect(res.success).toBe(true)
    expect(api.insert).toHaveBeenCalled()
    const row = api.insert.mock.calls[0][0]
    expect(row.display_id).toBe('')
    expect(row.title).toBe('Ship')
  })

  it('softDeleteDeliverable soft-deletes', async () => {
    const api = {
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    }
    fromMock.mockReturnValue(api)
    const res = await softDeleteDeliverable('d1', 'user-1')
    expect(res.success).toBe(true)
    expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
  })
})
