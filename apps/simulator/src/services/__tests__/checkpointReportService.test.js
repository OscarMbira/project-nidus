/**
 * Checkpoint Report Service Tests
 * Tests for checkpointReportService.js functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCheckpointReport,
  getCheckpointReportById,
  getCheckpointReportsByProject,
  getCheckpointReportsByWorkPackage,
  updateCheckpointReport,
  deleteCheckpointReport,
  getLatestCheckpointReport,
  getPreviousCheckpointReport,
  carryForwardFromPrevious,
  getToleranceStatus,
  runQualityChecks,
  getQualityCheckStatus,
  canSubmitForApproval
} from '../checkpointReportService'

// Mock Supabase
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

describe('Checkpoint Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCheckpointReport', () => {
    it('should create a checkpoint report successfully', async () => {
      const reportData = {
        checkpoint_date: '2026-01-20',
        report_title: 'Test Checkpoint Report',
        report_summary: 'This is a test checkpoint report summary',
        progress_summary: 'Progress made during this period'
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

      const result = await createCheckpointReport('project-123', 'wp-123', reportData)
      expect(result).toBeDefined()
      expect(result.id).toBe('report-123')
      expect(result.document_ref).toBe('CPR-PROJ001-WP01-001')
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      await expect(
        createCheckpointReport('project-123', 'wp-123', {})
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('getCheckpointReportById', () => {
    it('should fetch checkpoint report by id', async () => {
      const mockReport = {
        id: 'report-123',
        report_title: 'Test Report',
        document_ref: 'CPR-PROJ001-WP01-001'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockReport, error: null }))
          }))
        }))
      })

      const result = await getCheckpointReportById('report-123')
      expect(result).toBeDefined()
      expect(result.id).toBe('report-123')
      expect(result.report_title).toBe('Test Report')
    })

    it('should throw error if report not found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } }))
          }))
        }))
      })

      await expect(getCheckpointReportById('invalid-id')).rejects.toThrow()
    })
  })

  describe('getCheckpointReportsByWorkPackage', () => {
    it('should fetch reports for a work package', async () => {
      const mockReports = [
        { id: 'report-1', report_title: 'Report 1' },
        { id: 'report-2', report_title: 'Report 2' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockReports, error: null }))
            }))
          }))
        }))
      })

      const result = await getCheckpointReportsByWorkPackage('wp-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
    })

    it('should apply filters when provided', async () => {
      const mockReports = [{ id: 'report-1', status: 'approved' }]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockReports, error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await getCheckpointReportsByWorkPackage('wp-123', { status: 'approved' })
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
    })
  })

  describe('updateCheckpointReport', () => {
    it('should update checkpoint report successfully', async () => {
      const updates = {
        report_title: 'Updated Report Title',
        report_summary: 'Updated summary'
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{ id: 'report-123', ...updates }],
              error: null
            }))
          }))
        }))
      })

      const result = await updateCheckpointReport('report-123', updates)
      expect(result).toBeDefined()
      expect(result.report_title).toBe('Updated Report Title')
    })
  })

  describe('deleteCheckpointReport', () => {
    it('should soft delete checkpoint report', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      await expect(deleteCheckpointReport('report-123')).resolves.not.toThrow()
    })
  })

  describe('getLatestCheckpointReport', () => {
    it('should fetch latest report for work package', async () => {
      const mockReport = {
        id: 'report-latest',
        checkpoint_date: '2026-01-20'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockReport, error: null }))
                }))
              }))
            }))
          }))
        }))
      })

      const result = await getLatestCheckpointReport('wp-123')
      expect(result).toBeDefined()
      expect(result.id).toBe('report-latest')
    })
  })

  describe('carryForwardFromPrevious', () => {
    it('should carry forward open items from previous report', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 3, error: null })

      const result = await carryForwardFromPrevious('target-report-123', 'source-report-123')
      expect(result).toBe(3)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('carry_forward_open_items', {
        p_source_report_id: 'source-report-123',
        p_target_report_id: 'target-report-123'
      })
    })
  })

  describe('getToleranceStatus', () => {
    it('should fetch tolerance status for work package', async () => {
      const mockTolerance = [
        { tolerance_type: 'time', status: 'within', variance_percentage: 5.2 }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockTolerance, error: null })

      const result = await getToleranceStatus('wp-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].tolerance_type).toBe('time')
    })
  })

  describe('runQualityChecks', () => {
    it('should run quality checks for report', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      await expect(runQualityChecks('report-123')).resolves.not.toThrow()
      expect(mockSupabase.rpc).toHaveBeenCalledWith('run_checkpoint_quality_checks', {
        p_checkpoint_report_id: 'report-123'
      })
    })
  })

  describe('getQualityCheckStatus', () => {
    it('should fetch quality check status', async () => {
      const mockStatus = {
        passed: 3,
        failed: 1,
        needs_review: 1,
        not_checked: 0,
        total_criteria: 5,
        completion_percentage: 80,
        can_submit: false,
        blocking_issues: ['Criterion 2 failed']
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatus, error: null })

      const result = await getQualityCheckStatus('report-123')
      expect(result).toBeDefined()
      expect(result.passed).toBe(3)
      expect(result.can_submit).toBe(false)
    })
  })

  describe('canSubmitForApproval', () => {
    it('should return true if quality checks pass', async () => {
      const mockStatus = {
        can_submit: true,
        blocking_issues: []
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatus, error: null })

      const result = await canSubmitForApproval('report-123')
      expect(result).toBe(true)
    })

    it('should return false if quality checks fail', async () => {
      const mockStatus = {
        can_submit: false,
        blocking_issues: ['Criterion 2 failed']
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStatus, error: null })

      const result = await canSubmitForApproval('report-123')
      expect(result).toBe(false)
    })
  })
})
