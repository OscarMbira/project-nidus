import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getITTOTemplates, getProjectITTOs } from '../ittoService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('ittoService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getITTOTemplates queries itto_templates with organisation filter', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getITTOTemplates('org-uuid-1')
    expect(mockFrom).toHaveBeenCalledWith('itto_templates')
    expect(chain.eq).toHaveBeenCalledWith('organisation_id', 'org-uuid-1')
  })

  it('getProjectITTOs queries project_ittos', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getProjectITTOs('proj-1')
    expect(mockFrom).toHaveBeenCalledWith('project_ittos')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
  })
})
