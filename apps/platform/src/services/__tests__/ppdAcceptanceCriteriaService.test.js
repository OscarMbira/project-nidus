/**
 * Unit tests for ppdAcceptanceCriteriaService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as service from '../ppdAcceptanceCriteriaService'
import { supabase } from '../supabaseClient'

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn()
            })),
            single: vi.fn()
          })),
          maybeSingle: vi.fn(),
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          })),
          single: vi.fn()
        }))
      }))
    })),
    rpc: vi.fn(() => ({
      data: null,
      error: null
    }))
  }
}))

describe('ppdAcceptanceCriteriaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addCriteria', () => {
    it('should add a new acceptance criterion', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'internal-user-123' }
      const mockCriterion = {
        id: 'criteria-123',
        ppd_id: 'ppd-123',
        criteria_title: 'Test Criterion',
        criteria_number: 1
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }))
      }).mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: 'AC-001',
          error: null
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockUserData,
                error: null
              }))
            }))
          }))
        }))
      }).mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockCriterion,
              error: null
            }))
          }))
        }))
      })

      const result = await service.addCriteria('ppd-123', {
        criteria_title: 'Test Criterion'
      })

      expect(result).toEqual(mockCriterion)
    })
  })

  describe('getCriteria', () => {
    it('should fetch criteria for PPD', async () => {
      const mockCriteria = [
        { id: 'criteria-1', criteria_title: 'Criterion 1' },
        { id: 'criteria-2', criteria_title: 'Criterion 2' }
      ]

      const chain = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }

      supabase.from.mockReturnValue({
        select: vi.fn(() => chain)
      })

      chain.data = mockCriteria
      chain.error = null

      const result = await service.getCriteria('ppd-123')

      expect(result).toEqual(mockCriteria)
    })

    it('should apply filters when provided', async () => {
      const mockCriteria = [
        { id: 'criteria-1', criteria_category: 'functional' }
      ]

      const chain = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }

      supabase.from.mockReturnValue({
        select: vi.fn(() => chain)
      })

      chain.data = mockCriteria
      chain.error = null

      const result = await service.getCriteria('ppd-123', { category: 'functional' })

      expect(result).toEqual(mockCriteria)
    })
  })

  describe('recordAcceptance', () => {
    it('should record acceptance result', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'internal-user-123' }
      const mockCriterion = {
        id: 'criteria-123',
        acceptance_status: 'passed'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { ppd_id: 'ppd-123' },
                error: null
              }))
            }))
          }))
        }))
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockUserData,
                error: null
              }))
            }))
          }))
        }))
      })

      supabase.rpc.mockReturnValueOnce({
        data: true,
        error: null
      }).mockReturnValueOnce({
        data: mockCriterion,
        error: null
      })

      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCriterion,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await service.recordAcceptance('criteria-123', 'passed', 'Test notes')

      expect(result).toEqual(mockCriterion)
    })
  })
})
