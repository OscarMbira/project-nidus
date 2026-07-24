/**
 * Checkpoint Report Approval Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  submitForApproval,
  approveReport,
  rejectReport,
  getApprovalStatus,
  getPendingApprovals
} from '../checkpointReportApprovalService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } }))
  },
  from: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('Checkpoint Report Approval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitForApproval', () => {
    it('should submit report for approval', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'approval-123',
              checkpoint_report_id: 'report-123',
              approver_id: 'approver-123',
              approval_status: 'pending'
            }],
            error: null
          }))
        }))
      })

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      const result = await submitForApproval('report-123', 'approver-123')
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('pending')
    })
  })

  describe('approveReport', () => {
    it('should approve report successfully', async () => {
      const comments = 'Approved - looks good'

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'approval-123',
                approval_status: 'approved',
                comments
              }],
              error: null
            }))
          }))
        }))
      })

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      const result = await approveReport('report-123', 'approval-123', comments)
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('approved')
    })
  })

  describe('rejectReport', () => {
    it('should reject report successfully', async () => {
      const comments = 'Needs more detail'

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'approval-123',
                approval_status: 'rejected',
                comments
              }],
              error: null
            }))
          }))
        }))
      })

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      const result = await rejectReport('report-123', 'approval-123', comments)
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('rejected')
    })
  })

  describe('getApprovalStatus', () => {
    it('should fetch approval status for report', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          approval_status: 'pending',
          approver: { full_name: 'John Doe' }
        }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockApprovals, error: null }))
          }))
        }))
      })

      const result = await getApprovalStatus('report-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })
  })

  describe('getPendingApprovals', () => {
    it('should fetch pending approvals for user', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          checkpoint_report_id: 'report-123',
          approval_status: 'pending'
        }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockApprovals, error: null }))
            }))
          }))
        }))
      })

      const result = await getPendingApprovals('user-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })
  })
})
