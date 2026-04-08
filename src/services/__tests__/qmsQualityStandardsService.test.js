/**
 * QMS Quality Standards Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as standardsService from '../qmsQualityStandardsService'
import { supabase } from '../supabaseClient'

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('QMSQualityStandardsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addStandard', () => {
    it('should add a quality standard successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockStandard = {
        id: 'standard-123',
        qms_id: 'qms-123',
        standard_code: 'ISO 9001',
        standard_name: 'ISO 9001:2015'
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockUserData,
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'qms_quality_standards') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    data: [],
                    error: null
                  }))
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockStandard,
                  error: null
                }))
              }))
            }))
          }
        }
      })

      const result = await standardsService.addStandard('qms-123', {
        standard_code: 'ISO 9001',
        standard_name: 'ISO 9001:2015',
        standard_type: 'international',
        compliance_level: 'mandatory'
      })

      expect(result).toEqual(mockStandard)
      expect(supabase.from).toHaveBeenCalledWith('qms_quality_standards')
    })
  })

  describe('getStandards', () => {
    it('should fetch all standards for a QMS', async () => {
      const mockStandards = [
        { id: 'std-1', standard_code: 'ISO 9001', standard_name: 'ISO 9001:2015' },
        { id: 'std-2', standard_code: 'ISO 27001', standard_name: 'ISO 27001:2013' }
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: mockStandards,
              error: null
            }))
          }))
        }))
      })

      const result = await standardsService.getStandards('qms-123')

      expect(result).toEqual(mockStandards)
      expect(supabase.from).toHaveBeenCalledWith('qms_quality_standards')
    })
  })

  describe('updateStandard', () => {
    it('should update a standard successfully', async () => {
      const mockUpdatedStandard = {
        id: 'standard-123',
        standard_code: 'ISO 9001',
        standard_name: 'ISO 9001:2025'
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockUpdatedStandard,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await standardsService.updateStandard('standard-123', {
        standard_name: 'ISO 9001:2025'
      })

      expect(result).toEqual(mockUpdatedStandard)
    })
  })

  describe('deleteStandard', () => {
    it('should delete a standard successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      })

      const result = await standardsService.deleteStandard('standard-123')

      expect(result).toBe(true)
    })
  })
})
