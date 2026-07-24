import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSimITTOTemplates, getSimProjectITTOs } from '../simIttoService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('simIttoService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getSimITTOTemplates queries sim.itto_templates via simDb', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getSimITTOTemplates('acc-1')
    expect(mockFrom).toHaveBeenCalledWith('itto_templates')
    expect(chain.eq).toHaveBeenCalledWith('organisation_id', 'acc-1')
  })

  it('getSimProjectITTOs queries project_ittos with practice_project_id', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    await getSimProjectITTOs('pp-1')
    expect(mockFrom).toHaveBeenCalledWith('project_ittos')
    expect(chain.eq).toHaveBeenCalledWith('practice_project_id', 'pp-1')
  })
})
