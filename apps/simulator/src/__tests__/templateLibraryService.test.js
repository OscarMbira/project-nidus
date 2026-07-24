import { describe, it, expect, vi } from 'vitest'
import * as templateLibraryService from '../services/templateLibraryService'

vi.mock('../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}))

describe('templateLibraryService', () => {
  it('exports listTemplateCategories', () => {
    expect(typeof templateLibraryService.listTemplateCategories).toBe('function')
  })
  it('exports getTemplatesForAccount', () => {
    expect(typeof templateLibraryService.getTemplatesForAccount).toBe('function')
  })
})
