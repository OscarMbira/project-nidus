import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadPracticeDefectAttachment } from '../practiceDefectService'
import { simDb } from '../../supabase/supabaseClient'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

describe('practiceDefectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploadPracticeDefectAttachment only uploads and inserts — no wasted signed-URL round trip (rule 66)', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'pp-1/def-1/x.png' }, error: null })
    const createSignedUrls = vi.fn()
    simDb.storage.from.mockReturnValueOnce({ upload, createSignedUrls })
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'att-1', file_path: 'pp-1/def-1/x.png' }, error: null }),
    }
    simDb.from.mockReturnValueOnce(insertChain)

    const file = new File(['abc'], 'x.png', { type: 'image/png' })
    const out = await uploadPracticeDefectAttachment({
      practiceProjectId: 'pp-1',
      defectId: 'def-1',
      file,
      uploaded_by: 'user-1',
    })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(insertChain.insert).toHaveBeenCalledTimes(1)
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(out.attachment).toEqual({ id: 'att-1', file_path: 'pp-1/def-1/x.png' })
  })
})
