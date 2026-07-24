/**
 * EPR Approval Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  submitForApproval,
  approveReport,
  rejectReport,
  getApprovalStatus,
  getPendingApprovals
} from '../eprApprovalService'

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

describe('EPR Approval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitForApproval', () => {
    it('should submit report for approval', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { full_name: 'Approver', email: 'approver@test.com' }, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { version_no: '1.0' }, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'approval-123',
                approval_status: 'pending'
              }],
              error: null
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await submitForApproval('report-123', 'approver-123')
      expect(result).toBeDefined()
      expect(result.id).toBe('approval-123')
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      await expect(
        submitForApproval('report-123', 'approver-123')
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('approveReport', () => {
    it('should approve report', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'approval-123',
                  approval_status: 'approved'
                }],
                error: null
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await approveReport('report-123', 'approval-123', 'Approved')
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('approved')
    })
  })

  describe('rejectReport', () => {
    it('should reject report', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'approval-123',
                  approval_status: 'rejected'
                }],
                error: null
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await rejectReport('report-123', 'approval-123', 'Rejected')
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('rejected')
    })
  })

  describe('getApprovalStatus', () => {
    it('should get approval status', async () => {
      const mockStatus = {
        total_approvals: 2,
        approved: 1,
        pending: 1,
        rejected: 0
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { approval_status: 'approved' },
              { approval_status: 'pending' }
            ],
            error: null
          }))
        }))
      })

      const result = await getApprovalStatus('report-123')
      expect(result).toBeDefined()
    })
  })

  describe('getPendingApprovals', () => {
    it('should get pending approvals', async () => {
      const mockApprovals = [
        { id: 'approval-1', approval_status: 'pending' },
        { id: 'approval-2', approval_status: 'pending' }
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

      const result = await getPendingApprovals('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })
})
