import { describe, it, expect, vi } from 'vitest'
import * as simProjectTemplateCopyService from '../../services/sim/simProjectTemplateCopyService'

vi.mock('../../services/supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  platformDb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}))

describe('simProjectTemplateCopyService', () => {
  it('exports listSimulationRunsForPicker', () => {
    expect(typeof simProjectTemplateCopyService.listSimulationRunsForPicker).toBe('function')
  })
})
