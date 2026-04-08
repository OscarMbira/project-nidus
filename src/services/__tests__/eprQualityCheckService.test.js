/**
 * EPR Quality Check Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runQualityChecks,
  getQualityCheckStatus,
  getQualityChecks,
  updateQualityCheck,
  overrideQualityCheck,
  canCloseProject
} from '../eprQualityCheckService'

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

describe('EPR Quality Check Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('runQualityChecks', () => {
    it('should run quality checks', async () => {
      const mockChecks = [
        { criterion_number: 1, validation_status: 'passed' },
        { criterion_number: 2, validation_status: 'failed' }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockChecks,
        error: null
      })

      const result = await runQualityChecks('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })

  describe('getQualityCheckStatus', () => {
    it('should get quality check status', async () => {
      const mockStatus = {
        total_criteria: 4,
        passed: 3,
        failed: 1,
        can_close_project: false
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockStatus],
        error: null
      })

      const result = await getQualityCheckStatus('report-123')
      expect(result).toBeDefined()
      expect(result.total_criteria).toBe(4)
    })
  })

  describe('getQualityChecks', () => {
    it('should get all quality checks', async () => {
      const mockChecks = [
        { id: 'check-1', criterion_number: 1 },
        { id: 'check-2', criterion_number: 2 }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockChecks, error: null }))
          }))
        }))
      })

      const result = await getQualityChecks('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })

  describe('updateQualityCheck', () => {
    it('should update quality check', async () => {
      const updates = {
        validation_status: 'passed',
        manual_check_comment: 'Manually verified'
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'check-123',
                ...updates
              }],
              error: null
            }))
          }))
        }))
      })

      const result = await updateQualityCheck('check-123', updates)
      expect(result).toBeDefined()
      expect(result.validation_status).toBe('passed')
    })
  })

  describe('overrideQualityCheck', () => {
    it('should override quality check', async () => {
      const overrideData = {
        validation_status: 'manual_override',
        override_reason: 'Special circumstances'
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'check-123',
                ...overrideData
              }],
              error: null
            }))
          }))
        }))
      })

      const result = await overrideQualityCheck('check-123', 'Special circumstances', 'user-123')
      expect(result).toBeDefined()
      expect(result.validation_status).toBe('manual_override')
    })
  })

  describe('canCloseProject', () => {
    it('should return true if project can be closed', async () => {
      const mockStatus = {
        can_close_project: true
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockStatus],
        error: null
      })

      const result = await canCloseProject('report-123')
      expect(result).toBe(true)
    })

    it('should return false if project cannot be closed', async () => {
      const mockStatus = {
        can_close_project: false
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockStatus],
        error: null
      })

      const result = await canCloseProject('report-123')
      expect(result).toBe(false)
    })
  })
})
