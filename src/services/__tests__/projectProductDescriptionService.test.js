/**
 * Unit tests for projectProductDescriptionService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as service from '../projectProductDescriptionService'
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
            maybeSingle: vi.fn(),
            single: vi.fn()
          }))
        })),
        single: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          })),
          single: vi.fn()
        }))
      })),
      rpc: vi.fn(() => ({
        data: null,
        error: null
      }))
    })),
    rpc: vi.fn(() => ({
      data: null,
      error: null
    }))
  }
}))

describe('projectProductDescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPPD', () => {
    it('should create a new PPD successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'internal-user-123' }
      const mockPPD = {
        id: 'ppd-123',
        project_id: 'project-123',
        product_title: 'Test Product',
        status: 'draft'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      const fromMock = {
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
      }
      
      supabase.from.mockReturnValueOnce(fromMock)
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockPPD,
                error: null
              }))
            }))
          }))
        })

      const result = await service.createPPD('project-123', {
        product_title: 'Test Product'
      })

      expect(result).toEqual(mockPPD)
    })

    it('should throw error if user not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      await expect(service.createPPD('project-123', {})).rejects.toThrow('User not authenticated')
    })
  })

  describe('getPPDByProject', () => {
    it('should fetch PPD by project ID', async () => {
      const mockPPD = {
        id: 'ppd-123',
        project_id: 'project-123',
        product_title: 'Test Product'
      }

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => ({
                data: mockPPD,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await service.getPPDByProject('project-123')

      expect(result).toEqual(mockPPD)
    })

    it('should return null if PPD not found', async () => {
      supabase.from.mockReturnValue({
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

      const result = await service.getPPDByProject('project-123')

      expect(result).toBeNull()
    })
  })

  describe('updatePPD', () => {
    it('should update PPD successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'internal-user-123' }
      const mockUpdatedPPD = {
        id: 'ppd-123',
        product_title: 'Updated Product Title'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      supabase.from.mockReturnValueOnce({
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
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockUpdatedPPD,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await service.updatePPD('ppd-123', {
        product_title: 'Updated Product Title'
      })

      expect(result).toEqual(mockUpdatedPPD)
    })
  })

  describe('deletePPD', () => {
    it('should delete draft PPD', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'internal-user-123' }
      const mockPPD = {
        id: 'ppd-123',
        status: 'draft'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      
      // Mock getPPDById
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockPPD,
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
      }).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })

      const result = await service.deletePPD('ppd-123')

      expect(result).toBe(true)
    })

    it('should throw error if trying to delete non-draft PPD', async () => {
      const mockPPD = {
        id: 'ppd-123',
        status: 'approved'
      }

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockPPD,
                error: null
              }))
            }))
          }))
        }))
      })

      await expect(service.deletePPD('ppd-123')).rejects.toThrow('Can only delete PPDs in draft status')
    })
  })
})
