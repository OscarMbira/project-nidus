import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDefects, getDefectById, getDefectStats, uploadDefectAttachment } from '../defectService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

function mockQueryChain(result) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  chain.order = vi.fn().mockResolvedValue(result)
  return chain
}

describe('defectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploadDefectAttachment only uploads and inserts — no wasted signed-URL round trip (rule 66)', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'proj-1/def-1/x.png' }, error: null })
    const createSignedUrls = vi.fn()
    platformDb.storage.from.mockReturnValueOnce({ upload, createSignedUrls })
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'att-1', file_path: 'proj-1/def-1/x.png' }, error: null }),
    }
    platformDb.from.mockReturnValueOnce(insertChain)

    const file = new File(['abc'], 'x.png', { type: 'image/png' })
    const out = await uploadDefectAttachment({ projectId: 'proj-1', defectId: 'def-1', file, uploaded_by: 'user-1' })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(insertChain.insert).toHaveBeenCalledTimes(1)
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(out.attachment).toEqual({ id: 'att-1', file_path: 'proj-1/def-1/x.png' })
  })

  it('getDefects returns data array', async () => {
    const rows = [{ id: '1', defect_ref: 'DEF-1', title: 'Bug' }]
    platformDb.from.mockReturnValue(mockQueryChain({ data: rows, error: null }))
    const out = await getDefects('proj-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('defects')
  })

  it('getDefectById throws on error', async () => {
    platformDb.from.mockReturnValue(
      mockQueryChain({ data: null, error: { message: 'not found' } }),
    )
    await expect(getDefectById('x')).rejects.toEqual({ message: 'not found' })
  })

  it('getDefectStats aggregates counts', async () => {
    const data = [
      { status: 'new', severity: 'high', created_at: '2026-03-27T10:00:00Z' },
      { status: 'open', severity: 'medium', created_at: '2026-03-27T11:00:00Z' },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data, error: null })
    platformDb.from.mockReturnValue(chain)
    const stats = await getDefectStats('p1')
    expect(stats.total).toBe(2)
    expect(stats.byStatus.new).toBe(1)
    expect(stats.bySeverity.high).toBe(1)
  })
})
