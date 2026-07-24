import { describe, it, expect, vi } from 'vitest'
import * as projectTemplateCopyService from '../services/projectTemplateCopyService'

vi.mock('../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}))

describe('projectTemplateCopyService', () => {
  it('exports getCopyById', () => {
    expect(typeof projectTemplateCopyService.getCopyById).toBe('function')
  })
})
