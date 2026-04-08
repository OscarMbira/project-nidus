/**
 * Checkpoint Report Workflow Integration Tests
 * Tests complete workflows for checkpoint report creation, approval, and export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCheckpointReport,
  submitForApproval,
  approveReport,
  runQualityChecks,
  getQualityCheckStatus
} from '../../services/checkpointReportService'
import { submitForApproval as submitApproval } from '../../services/checkpointReportApprovalService'
import { approveReport as approve } from '../../services/checkpointReportApprovalService'

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

describe('Checkpoint Report Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Report Creation Workflow', () => {
    it('should create report, add products, run quality checks, and submit for approval', async () => {
      // Step 1: Create report
      const reportData = {
        checkpoint_date: '2026-01-20',
        report_title: 'Test Checkpoint Report',
        report_summary: 'This is a comprehensive test checkpoint report',
        progress_summary: 'Significant progress made'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'report-123',
              ...reportData,
              document_ref: 'CPR-PROJ001-WP01-001',
              version_no: '1.0',
              status: 'draft'
            }],
            error: null
          }))
        }))
      })

      const report = await createCheckpointReport('project-123', 'wp-123', reportData)
      expect(report).toBeDefined()
      expect(report.id).toBe('report-123')
      expect(report.status).toBe('draft')

      // Step 2: Initialize quality checks (triggered automatically)
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      // Step 3: Run quality checks
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })
      await runQualityChecks(report.id)

      // Step 4: Get quality check status
      const mockQualityStatus = {
        passed: 5,
        failed: 0,
        needs_review: 0,
        not_checked: 0,
        total_criteria: 5,
        completion_percentage: 100,
        can_submit: true,
        blocking_issues: []
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockQualityStatus, error: null })
      const qualityStatus = await getQualityCheckStatus(report.id)
      expect(qualityStatus.can_submit).toBe(true)

      // Step 5: Submit for approval
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'approval-123',
              checkpoint_report_id: report.id,
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

      const approval = await submitApproval(report.id, 'approver-123')
      expect(approval).toBeDefined()
      expect(approval.approval_status).toBe('pending')
    })
  })

  describe('Approval Workflow', () => {
    it('should complete approval workflow from submission to approval', async () => {
      // Submit for approval
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

      const submission = await submitApproval('report-123', 'approver-123')
      expect(submission.approval_status).toBe('pending')

      // Approve report
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'approval-123',
                approval_status: 'approved',
                comments: 'Approved'
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

      const approval = await approve('report-123', 'approval-123', 'Approved')
      expect(approval.approval_status).toBe('approved')
    })
  })

  describe('Quality Check Workflow', () => {
    it('should run quality checks and determine if report can be submitted', async () => {
      // Run quality checks
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })
      await runQualityChecks('report-123')

      // Get quality status - all passed
      const mockStatusPassed = {
        passed: 5,
        failed: 0,
        can_submit: true,
        blocking_issues: []
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatusPassed, error: null })
      const statusPassed = await getQualityCheckStatus('report-123')
      expect(statusPassed.can_submit).toBe(true)

      // Get quality status - some failed
      const mockStatusFailed = {
        passed: 3,
        failed: 2,
        can_submit: false,
        blocking_issues: ['Criterion 2 failed', 'Criterion 4 failed']
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatusFailed, error: null })
      const statusFailed = await getQualityCheckStatus('report-123')
      expect(statusFailed.can_submit).toBe(false)
      expect(statusFailed.blocking_issues.length).toBe(2)
    })
  })

  describe('Carry-Forward Workflow', () => {
    it('should carry forward open items from previous report', async () => {
      // Create new report
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'report-new',
              status: 'draft'
            }],
            error: null
          }))
        }))
      })

      const newReport = await createCheckpointReport('project-123', 'wp-123', {
        checkpoint_date: '2026-01-20',
        report_summary: 'New report'
      })

      // Carry forward items
      mockSupabase.rpc.mockResolvedValueOnce({ data: 3, error: null })
      const { carryForwardFromPrevious } = await import('../../services/checkpointReportService')
      const count = await carryForwardFromPrevious(newReport.id, 'report-old')
      expect(count).toBe(3)
    })
  })
})
