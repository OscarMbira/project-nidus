/**
 * Unit Tests for Exception Report Approval Service
 * Tests approval workflow and board decisions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addApproval,
  submitForApproval,
  approveReport,
  rejectReport,
  recordBoardDecision,
  getApprovalStatus
} from '../exceptionReportApprovalService'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn()
      }))
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
    }))
  }))
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

vi.mock('../exceptionReportService', () => ({
  canSubmitForApproval: vi.fn()
}))

describe('Exception Report Approval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  })

  describe('submitForApproval', () => {
    it('should submit report for approval', async () => {
      const reportId = 'test-report-id'
      const approverIds = ['approver1', 'approver2']

      const { canSubmitForApproval } = await import('../exceptionReportService')
      canSubmitForApproval.mockResolvedValue(true)

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { version_no: '1.0' },
        error: null
      })

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'approver-id', full_name: 'Test Approver' },
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'approval-id', approval_status: 'pending' },
        error: null
      })

      const result = await submitForApproval(reportId, approverIds)

      expect(result).toHaveLength(2)
      expect(canSubmitForApproval).toHaveBeenCalledWith(reportId)
    })

    it('should reject submission if quality checks fail', async () => {
      const reportId = 'test-report-id'
      const approverIds = ['approver1']

      const { canSubmitForApproval } = await import('../exceptionReportService')
      canSubmitForApproval.mockResolvedValue(false)

      await expect(submitForApproval(reportId, approverIds)).rejects.toThrow(
        'Report does not meet quality criteria'
      )
    })
  })

  describe('approveReport', () => {
    it('should approve report', async () => {
      const approvalId = 'test-approval-id'
      const comments = 'Approved'

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { approver_id: 'test-user-id', exception_report_id: 'test-report-id' },
        error: null
      })

      mockSupabase.from().select().eq.mockResolvedValue({
        data: [
          { approval_status: 'approved' },
          { approval_status: 'approved' }
        ],
        error: null
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { id: approvalId, approval_status: 'approved' },
        error: null
      })

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await approveReport(approvalId, comments)

      expect(result.approval_status).toBe('approved')
    })
  })

  describe('recordBoardDecision', () => {
    it('should record board decision', async () => {
      const reportId = 'test-report-id'
      const decision = 'Proceed with Option 1'
      const decisionDate = new Date('2026-01-20')

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: reportId,
          board_decision: decision,
          board_decision_date: decisionDate.toISOString().split('T')[0],
          report_status: 'decision_pending'
        },
        error: null
      })

      const result = await recordBoardDecision(reportId, decision, decisionDate)

      expect(result.board_decision).toBe(decision)
      expect(result.report_status).toBe('decision_pending')
    })
  })
})
