import { describe, it, expect, vi } from 'vitest'
import { isColumnAvailable } from '../columnProbe'

function client(error) {
  const limit = vi.fn(() => Promise.resolve({ data: [], error }))
  return { from: vi.fn(() => ({ select: () => ({ limit }) })), limit }
}

describe('isColumnAvailable (v1338 — fields that arrive with SQL run later)', () => {
  it('is true when the column can be selected, and asks once per table and column', async () => {
    const db = client(null)
    expect(await isColumnAvailable(db, 'change_requests', 'related_requirement_ids')).toBe(true)
    expect(await isColumnAvailable(db, 'change_requests', 'related_requirement_ids')).toBe(true)
    expect(db.limit).toHaveBeenCalledTimes(1)
  })

  it('is false while the column is missing', async () => {
    const db = client({ code: '42703', message: 'column change_requests.related_requirement_ids does not exist' })
    expect(await isColumnAvailable(db, 'change_requests', 'related_requirement_ids')).toBe(false)
  })

  it('is false without a client', async () => {
    expect(await isColumnAvailable(null, 'x', 'y')).toBe(false)
  })
})
