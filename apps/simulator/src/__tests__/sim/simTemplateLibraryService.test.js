import { describe, it, expect, vi } from 'vitest'
import * as simTemplateLibraryService from '../../services/sim/simTemplateLibraryService'

vi.mock('../../services/supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
  platformDb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}))

describe('simTemplateLibraryService', () => {
  it('exports listTemplateCategories', () => {
    expect(typeof simTemplateLibraryService.listTemplateCategories).toBe('function')
  })
})
