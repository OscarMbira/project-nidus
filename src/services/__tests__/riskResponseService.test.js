/**
 * Risk Response Service Unit Tests
 * Tests for riskResponseService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as riskResponseService from '../riskResponseService'
import { platformDb } from '../supabase/supabaseClient'

// Mock platformDb
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('riskResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getResponsesByRisk', () => {
    it('should fetch responses for a risk', async () => {
      const mockResponses = [
        { id: 'response-1', action_description: 'Action 1', risk_id: 'risk-id' },
        { id: 'response-2', action_description: 'Action 2', risk_id: 'risk-id' }
      ]

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockResponses, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskResponseService.getResponsesByRisk('risk-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponses)
    })
  })

  describe('createResponse', () => {
    it('should create a response successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }
      const mockResponse = {
        id: 'response-id',
        action_description: 'New Response',
        risk_id: 'risk-id'
      }

      platformDb.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const userQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRecord, error: null })
      }

      // Get existing responses count
      const countQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ count: 2 }], error: null })
      }

      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResponse, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(insertQuery)

      const result = await riskResponseService.createResponse({
        risk_id: 'risk-id',
        action_description: 'New Response'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('updateResponse', () => {
    it('should update a response successfully', async () => {
      const mockUpdatedResponse = {
        id: 'response-id',
        action_description: 'Updated Response'
      }

      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedResponse, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskResponseService.updateResponse('response-id', {
        action_description: 'Updated Response'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedResponse)
    })
  })

  describe('completeResponse', () => {
    it('should complete a response successfully', async () => {
      const mockCompletedResponse = {
        id: 'response-id',
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0]
      }

      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCompletedResponse, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskResponseService.completeResponse('response-id', 'Completed successfully')

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('completed')
    })
  })

  describe('assessEffectiveness', () => {
    it('should assess response effectiveness successfully', async () => {
      const mockAssessedResponse = {
        id: 'response-id',
        effectiveness_rating: 'effective'
      }

      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAssessedResponse, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskResponseService.assessEffectiveness('response-id', 'effective')

      expect(result.success).toBe(true)
      expect(result.data.effectiveness_rating).toBe('effective')
    })
  })
})
