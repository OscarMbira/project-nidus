/**
 * EPR Business Case Review Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addBenefitReview,
  updateBenefitReview,
  deleteBenefitReview,
  getBenefitsComparison
} from '../eprBusinessCaseReviewService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } }))
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('EPR Business Case Review Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addBenefitReview', () => {
    it('should add benefit review with variance calculation', async () => {
      const benefitData = {
        benefit_description: 'Test Benefit',
        benefit_type: 'achieved',
        original_target_value: 100000,
        actual_value: 95000
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'benefit-123',
              ...benefitData,
              variance: -5000,
              variance_percentage: -5.0
            }],
            error: null
          }))
        }))
      })

      const result = await addBenefitReview('report-123', benefitData)
      expect(result).toBeDefined()
      expect(result.variance).toBe(-5000)
      expect(result.variance_percentage).toBe(-5.0)
    })

    it('should handle missing values gracefully', async () => {
      const benefitData = {
        benefit_description: 'Test Benefit',
        benefit_type: 'achieved'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'benefit-123',
              ...benefitData,
              variance: null,
              variance_percentage: null
            }],
            error: null
          }))
        }))
      })

      const result = await addBenefitReview('report-123', benefitData)
      expect(result).toBeDefined()
      expect(result.variance).toBeNull()
    })
  })

  describe('updateBenefitReview', () => {
    it('should update benefit review', async () => {
      const updates = {
        actual_value: 100000,
        variance: 0
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'benefit-123',
                ...updates
              }],
              error: null
            }))
          }))
        }))
      })

      const result = await updateBenefitReview('benefit-123', updates)
      expect(result).toBeDefined()
      expect(result.actual_value).toBe(100000)
    })
  })

  describe('deleteBenefitReview', () => {
    it('should delete benefit review', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })

      await expect(deleteBenefitReview('benefit-123')).resolves.not.toThrow()
    })
  })

  describe('getBenefitsComparison', () => {
    it('should get benefits comparison', async () => {
      const mockBenefits = [
        { benefit_description: 'Benefit 1', variance: -5000 },
        { benefit_description: 'Benefit 2', variance: 10000 }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockBenefits, error: null }))
          }))
        }))
      })

      const result = await getBenefitsComparison('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })
})
