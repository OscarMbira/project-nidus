/**
 * End Stage Report Approval Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addApproval,
  submitForApproval,
  approveReport,
  rejectReport,
  deferReport,
  getApprovalStatus,
  getPendingApprovals,
  cancelApprovalRequest
} from '../endStageReportApprovalService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }))
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('End Stage Report Approval Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addApproval', () => {
    it('should add approval', async () => {
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
              single: vi.fn(() => Promise.resolve({ data: { role_name: 'project_manager' }, error: null }))
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

      const result = await addApproval('report-123', 'approver-123', '1.0')
      expect(result).toBeDefined()
      expect(result.id).toBe('approval-123')
    })
  })

  describe('approveReport', () => {
    it('should approve report', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { approver_id: 'user-123', end_stage_report_id: 'report-123' }, error: null }))
            }))
          }))
        })
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
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: [
                { approval_status: 'approved' },
                { approval_status: 'approved' }
              ],
              error: null
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await approveReport('approval-123', 'Approved', null)
      expect(result).toBeDefined()
      expect(result.approval_status).toBe('approved')
    })
  })

  describe('getApprovalStatus', () => {
    it('should get approval status', async () => {
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
      expect(result.total).toBe(2)
      expect(result.approved).toBe(1)
    })
  })
})
