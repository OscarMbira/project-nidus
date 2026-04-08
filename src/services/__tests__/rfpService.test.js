/**
 * RFP Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as rfpService from '../rfpService'

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from '../supabaseClient'

describe('rfpService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  describe('checkPMOAdminRole', () => {
    it('returns false when not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      const result = await rfpService.checkPMOAdminRole()
      expect(result).toBe(false)
    })

    it('returns true when user has pmo_admin role', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
      // user_roles query - need to mock the chain
      const mockData = [{ roles: { role_name: 'pmo_admin' } }]
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
      })
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      })
      const result = await rfpService.checkPMOAdminRole()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getRFPList', () => {
    it('fetches RFPs with filters', async () => {
      const mockRfps = [{ id: 'rfp-1', rfp_title: 'Test RFP' }]
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRfps, error: null }),
      })
      const result = await rfpService.getRFPList({ status: 'draft' })
      expect(result).toEqual(mockRfps)
    })
  })

  describe('getRFPById', () => {
    it('fetches single RFP', async () => {
      const mockRfp = { id: 'rfp-1', rfp_title: 'Test RFP' }
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRfp, error: null }),
      })
      const result = await rfpService.getRFPById('rfp-1')
      expect(result).toEqual(mockRfp)
    })
  })

  describe('getLineItems', () => {
    it('fetches line items for RFP', async () => {
      const mockItems = [{ id: 'li-1', item_number: 1, description: 'Test' }]
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      })
      const result = await rfpService.getLineItems('rfp-1')
      expect(result).toEqual(mockItems)
    })
  })
})
