/**
 * Quality Management Strategy Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as qmsService from '../qualityManagementStrategyService'
import { supabase } from '../supabaseClient'

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn()
        })),
        maybeSingle: vi.fn()
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}))

// Mock users table
const mockUsersTable = {
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn()
    }))
  }))
}

describe('QualityManagementStrategyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createQMS', () => {
    it('should create a new QMS successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123', full_name: 'Test User' }
      const mockQMS = {
        id: 'qms-123',
        project_id: 'project-123',
        qms_reference: 'QMS-2026-001',
        status: 'draft'
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'users') {
          return mockUsersTable
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockUserData,
                error: null
              }))
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockQMS,
                error: null
              }))
            }))
          }))
        }
      })

      mockUsersTable.select().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })

      const result = await qmsService.createQMS('project-123', {
        purpose: 'Test purpose',
        objectives: 'Test objectives',
        scope: 'Test scope'
      })

      expect(result).toEqual(mockQMS)
      expect(supabase.from).toHaveBeenCalledWith('users')
      expect(supabase.from).toHaveBeenCalledWith('quality_management_strategies')
    })

    it('should throw error if user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(qmsService.createQMS('project-123', {})).rejects.toThrow('User not authenticated')
    })
  })

  describe('getQMSByProject', () => {
    it('should fetch QMS for a project', async () => {
      const mockQMS = {
        id: 'qms-123',
        project_id: 'project-123',
        qms_reference: 'QMS-2026-001'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => ({
                data: mockQMS,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await qmsService.getQMSByProject('project-123')

      expect(result).toEqual({ success: true, data: mockQMS })
      expect(supabase.from).toHaveBeenCalledWith('quality_management_strategies')
    })

    it('should return success with null data if QMS not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => ({
                data: null,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await qmsService.getQMSByProject('project-123')

      expect(result).toEqual({ success: true, data: null })
    })
  })

  describe('updateQMS', () => {
    it('should update QMS successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockUpdatedQMS = {
        id: 'qms-123',
        purpose: 'Updated purpose',
        updated_at: new Date().toISOString()
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
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockUpdatedQMS,
                  error: null
                }))
              }))
            }))
          }))
        }
      })

      const result = await qmsService.updateQMS('qms-123', {
        purpose: 'Updated purpose'
      })

      expect(result).toEqual(mockUpdatedQMS)
      expect(supabase.from).toHaveBeenCalledWith('quality_management_strategies')
    })
  })

  describe('deleteQMS', () => {
    it('should delete draft QMS successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockQMS = {
        id: 'qms-123',
        status: 'draft'
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock getQMSById
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
        if (table === 'quality_management_strategies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockQMS,
                  error: null
                })),
                update: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    error: null
                  }))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                error: null
              }))
            }))
          }
        }
      })

      const result = await qmsService.deleteQMS('qms-123')

      expect(result).toBe(true)
    })

    it('should throw error if trying to delete non-draft QMS', async () => {
      const mockQMS = {
        id: 'qms-123',
        status: 'approved'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockQMS,
              error: null
            }))
          }))
        }))
      })

      await expect(qmsService.deleteQMS('qms-123')).rejects.toThrow('Can only delete QMS in draft status')
    })
  })

  describe('validateCompleteness', () => {
    it('should validate QMS completeness', async () => {
      const mockValidation = {
        sections: [
          { section_name: 'Introduction', is_complete: true, missing_items: [], recommendations: '' },
          { section_name: 'Quality Procedures', is_complete: true, missing_items: [], recommendations: '' }
        ],
        is_complete: true,
        incomplete_sections: 0,
        issues: [],
        completeness_score: 100
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockValidation.sections,
        error: null
      })

      const result = await qmsService.validateCompleteness('qms-123')

      expect(result.is_complete).toBe(true)
      expect(result.completeness_score).toBe(100)
      expect(supabase.rpc).toHaveBeenCalledWith('validate_qms_completeness', {
        p_qms_id: 'qms-123'
      })
    })
  })

  describe('checkConformance', () => {
    it('should check QMS conformance', async () => {
      const mockConformance = [
        {
          standard_name: 'Corporate Quality Policy',
          conformance_status: 'Conforms',
          gaps: [],
          recommendations: ''
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockConformance,
        error: null
      })

      const result = await qmsService.checkConformance('qms-123')

      expect(result).toEqual(mockConformance)
      expect(supabase.rpc).toHaveBeenCalledWith('check_qms_conformance', {
        p_qms_id: 'qms-123'
      })
    })
  })
})
