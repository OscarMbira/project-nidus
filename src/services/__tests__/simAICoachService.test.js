/**
 * Unit tests for simAICoachService (Phase 7.13)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPastDebriefs,
  getDebriefById,
  getRunSummary,
  getModuleScoresForRun,
  getSimCoachHintsEnabled,
} from '../simAICoachService'

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

const { simDb } = await import('../supabase/supabaseClient')

function chainOrder(data) {
  const c = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: data ?? [], error: null }),
  }
  return c
}

function chainSingle(data) {
  const c = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: data ?? null, error: null }),
  }
  return c
}

describe('simAICoachService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPastDebriefs', () => {
    it('returns empty array when no debriefs', async () => {
      simDb.from.mockReturnValue(chainOrder([]))
      const result = await getPastDebriefs('user-1')
      expect(result).toEqual([])
    })

    it('returns debriefs when present', async () => {
      const list = [{ id: 'd1', run_id: 'r1', content: {}, created_at: new Date().toISOString() }]
      simDb.from.mockReturnValue(chainOrder(list))
      const result = await getPastDebriefs('user-1')
      expect(result).toEqual(list)
    })
  })

  describe('getDebriefById', () => {
    it('returns null when not found', async () => {
      simDb.from.mockReturnValue(chainSingle(null))
      const result = await getDebriefById('id')
      expect(result).toBeNull()
    })
  })

  describe('getSimCoachHintsEnabled', () => {
    it('returns true when orgId is null', async () => {
      const result = await getSimCoachHintsEnabled(null)
      expect(result).toBe(true)
    })

    it('returns false when org has coach_hints_enabled false', async () => {
      simDb.from.mockReturnValue(chainSingle({ coach_hints_enabled: false }))
      const result = await getSimCoachHintsEnabled('org-1')
      expect(result).toBe(false)
    })

    it('returns true when org has coach_hints_enabled true', async () => {
      simDb.from.mockReturnValue(chainSingle({ coach_hints_enabled: true }))
      const result = await getSimCoachHintsEnabled('org-1')
      expect(result).toBe(true)
    })
  })
})
