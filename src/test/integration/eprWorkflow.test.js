/**
 * End Project Report Workflow Integration Tests
 * Tests complete workflows for EPR creation, approval, and closure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createEndProjectReport,
  updateEndProjectReport,
  getEndProjectReportById
} from '../../services/endProjectReportService'
import {
  submitForApproval,
  approveReport
} from '../../services/eprApprovalService'
import {
  addBenefitReview
} from '../../services/eprBusinessCaseReviewService'
import {
  runQualityChecks,
  canCloseProject
} from '../../services/eprQualityCheckService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } }))
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('EPR Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete EPR Creation and Approval Workflow', () => {
    it('should complete full workflow: create -> add benefits -> submit -> approve -> check quality', async () => {
      // Step 1: Create EPR
      mockSupabase.from
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'report-123',
                report_title: 'Test EPR',
                approval_status: 'draft',
                document_ref: 'EPR-PROJ001-001'
              }],
              error: null
            }))
          }))
        })

      const report = await createEndProjectReport('project-123', {
        report_title: 'Test EPR'
      })
      expect(report).toBeDefined()
      expect(report.approval_status).toBe('draft')

      // Step 2: Add benefit review
      mockSupabase.from
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'benefit-123',
                benefit_description: 'Test Benefit'
              }],
              error: null
            }))
          }))
        })

      const benefit = await addBenefitReview('report-123', {
        benefit_description: 'Test Benefit',
        benefit_type: 'achieved',
        original_target_value: 100000,
        actual_value: 95000
      })
      expect(benefit).toBeDefined()

      // Step 3: Submit for approval
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { full_name: 'Approver' }, error: null }))
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

      const approval = await submitForApproval('report-123', 'approver-123')
      expect(approval).toBeDefined()
      expect(approval.approval_status).toBe('pending')

      // Step 4: Approve report
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

      const approved = await approveReport('report-123', 'approval-123', 'Approved')
      expect(approved).toBeDefined()
      expect(approved.approval_status).toBe('approved')

      // Step 5: Run quality checks
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [
            { criterion_number: 1, validation_status: 'passed' },
            { criterion_number: 2, validation_status: 'passed' },
            { criterion_number: 3, validation_status: 'passed' },
            { criterion_number: 4, validation_status: 'passed' }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            total_criteria: 4,
            passed: 4,
            failed: 0,
            can_close_project: true
          }],
          error: null
        })

      const checks = await runQualityChecks('report-123')
      expect(checks).toBeDefined()
      expect(checks.length).toBe(4)

      const canClose = await canCloseProject('report-123')
      expect(canClose).toBe(true)
    })
  })

  describe('EPR Update Workflow', () => {
    it('should update EPR and maintain data integrity', async () => {
      // Get existing report
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'report-123',
                    report_title: 'Original Title',
                    approval_status: 'draft'
                  },
                  error: null
                }))
              }))
            }))
          }))
        })

      const existingReport = await getEndProjectReportById('report-123')
      expect(existingReport).toBeDefined()

      // Update report
      mockSupabase.from
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'report-123',
                  report_title: 'Updated Title',
                  approval_status: 'draft'
                }],
                error: null
              }))
            }))
          }))
        })

      const updated = await updateEndProjectReport('report-123', {
        report_title: 'Updated Title'
      })
      expect(updated).toBeDefined()
      expect(updated.report_title).toBe('Updated Title')
    })
  })
})
