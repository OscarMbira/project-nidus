/**
 * End Project Report Service Tests
 * Tests for endProjectReportService.js functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createEndProjectReport,
  getEndProjectReportById,
  getEndProjectReportByProject,
  updateEndProjectReport,
  deleteEndProjectReport,
  generateDocumentRef,
  calculateBenefitsVariance,
  getBusinessCaseForReview,
  runQualityChecks,
  getQualityCheckStatus,
  canCloseProject,
  getOpenIssuesForFollowOn,
  getOpenRisksForFollowOn
} from '../endProjectReportService'

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

describe('End Project Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createEndProjectReport', () => {
    it('should create an end project report successfully', async () => {
      const reportData = {
        report_title: 'Test End Project Report',
        report_date: '2026-01-20',
        version_no: '1.0',
        project_managers_report: 'This is a test report'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'report-123',
              ...reportData,
              document_ref: 'EPR-PROJ001-001',
              approval_status: 'draft',
              closure_type: 'normal'
            }],
            error: null
          }))
        }))
      })

      const result = await createEndProjectReport('project-123', reportData)
      expect(result).toBeDefined()
      expect(result.id).toBe('report-123')
      expect(result.document_ref).toBe('EPR-PROJ001-001')
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      await expect(
        createEndProjectReport('project-123', {})
      ).rejects.toThrow('User not authenticated')
    })

    it('should use default values when optional fields are missing', async () => {
      const reportData = {}

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{
              id: 'report-123',
              report_title: 'End Project Report',
              approval_status: 'draft',
              closure_type: 'normal'
            }],
            error: null
          }))
        }))
      })

      const result = await createEndProjectReport('project-123', reportData)
      expect(result).toBeDefined()
    })
  })

  describe('getEndProjectReportById', () => {
    it('should fetch end project report by id', async () => {
      const mockReport = {
        id: 'report-123',
        report_title: 'Test Report',
        document_ref: 'EPR-PROJ001-001'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockReport, error: null }))
            }))
          }))
        }))
      })

      const result = await getEndProjectReportById('report-123')
      expect(result).toBeDefined()
      expect(result.id).toBe('report-123')
      expect(result.report_title).toBe('Test Report')
    })

    it('should handle errors when fetching report', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } }))
            }))
          }))
        }))
      })

      await expect(getEndProjectReportById('invalid-id')).rejects.toBeDefined()
    })
  })

  describe('getEndProjectReportByProject', () => {
    it('should fetch end project report by project id', async () => {
      const mockReport = {
        id: 'report-123',
        project_id: 'project-123',
        report_title: 'Test Report'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockReport, error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await getEndProjectReportByProject('project-123')
      expect(result).toBeDefined()
      expect(result.project_id).toBe('project-123')
    })
  })

  describe('updateEndProjectReport', () => {
    it('should update end project report successfully', async () => {
      const updates = {
        report_title: 'Updated Report Title',
        project_managers_report: 'Updated report content'
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'report-123',
                ...updates
              }],
              error: null
            }))
          }))
        }))
      })

      const result = await updateEndProjectReport('report-123', updates)
      expect(result).toBeDefined()
      expect(result.report_title).toBe('Updated Report Title')
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      await expect(
        updateEndProjectReport('report-123', {})
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('deleteEndProjectReport', () => {
    it('should soft delete end project report', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })

      await expect(deleteEndProjectReport('report-123')).resolves.not.toThrow()
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

      await expect(
        deleteEndProjectReport('report-123')
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('generateDocumentRef', () => {
    it('should generate document reference', async () => {
      const mockRef = 'EPR-PROJ001-001'

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockRef,
        error: null
      })

      const result = await generateDocumentRef('project-123')
      expect(result).toBe(mockRef)
    })
  })

  describe('calculateBenefitsVariance', () => {
    it('should calculate benefits variance', async () => {
      const mockVariance = {
        total_expected: 100000,
        total_achieved: 95000,
        total_residual: 5000,
        variance: -5000,
        variance_percentage: -5.0
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockVariance],
        error: null
      })

      const result = await calculateBenefitsVariance('report-123')
      expect(result).toBeDefined()
      expect(result.total_expected).toBe(100000)
    })
  })

  describe('getBusinessCaseForReview', () => {
    it('should fetch business case for review', async () => {
      const mockBusinessCase = {
        business_case_id: 'bc-123',
        total_expected_benefits: 100000
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockBusinessCase],
        error: null
      })

      const result = await getBusinessCaseForReview('project-123')
      expect(result).toBeDefined()
      expect(result.business_case_id).toBe('bc-123')
    })
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

    it('should return false on error', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database error'))

      const result = await canCloseProject('report-123')
      expect(result).toBe(false)
    })
  })

  describe('getOpenIssuesForFollowOn', () => {
    it('should fetch open issues for follow-on', async () => {
      const mockIssues = [
        { issue_id: 'issue-1', issue_title: 'Issue 1', needs_follow_on: true },
        { issue_id: 'issue-2', issue_title: 'Issue 2', needs_follow_on: true }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockIssues,
        error: null
      })

      const result = await getOpenIssuesForFollowOn('project-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })

  describe('getOpenRisksForFollowOn', () => {
    it('should fetch open risks for follow-on', async () => {
      const mockRisks = [
        { risk_id: 'risk-1', risk_title: 'Risk 1', needs_follow_on: true }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockRisks,
        error: null
      })

      const result = await getOpenRisksForFollowOn('project-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
    })
  })
})
