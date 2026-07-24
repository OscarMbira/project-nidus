/**
 * End Stage Report Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateReportReference,
  getReportByStageBoundary,
  canEditReport,
  validateReportCompleteness,
  linkUpdatedDocuments,
  syncBusinessCaseReview,
  syncRiskRegister,
  syncIssueRegister,
  syncLessonsLearned,
  submitReportForApproval
} from '../endStageReportService'

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

describe('End Stage Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateReportReference', () => {
    it('should generate report reference', async () => {
      const mockRef = 'ESR-PROJ001-STAGE1-001'

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockRef,
        error: null
      })

      const result = await generateReportReference('project-123', 1)
      expect(result).toBe(mockRef)
    })
  })

  describe('getReportByStageBoundary', () => {
    it('should get report by stage boundary', async () => {
      const mockReport = {
        report_id: 'report-123',
        report_reference: 'ESR-PROJ001-STAGE1-001'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockReport],
        error: null
      })

      const result = await getReportByStageBoundary('stage-boundary-123')
      expect(result).toBeDefined()
      expect(result.report_id).toBe('report-123')
    })
  })

  describe('canEditReport', () => {
    it('should return true if user can edit', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await canEditReport('report-123', 'user-123')
      expect(result).toBe(true)
    })

    it('should return false if user cannot edit', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await canEditReport('report-123', 'user-123')
      expect(result).toBe(false)
    })
  })

  describe('validateReportCompleteness', () => {
    it('should validate report completeness', async () => {
      const mockValidation = {
        sections: [
          { section_name: 'Document Information', is_complete: true, completeness_percentage: 100 },
          { section_name: 'Basic Information', is_complete: true, completeness_percentage: 100 }
        ],
        overallCompleteness: 95,
        isComplete: true,
        canSubmit: true
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockValidation.sections,
        error: null
      })

      const result = await validateReportCompleteness('report-123')
      expect(result).toBeDefined()
      expect(result.sections).toBeDefined()
    })
  })

  describe('linkUpdatedDocuments', () => {
    it('should link updated documents', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      })

      await expect(
        linkUpdatedDocuments('report-123', {
          businessCaseId: 'bc-123',
          riskRegisterVersion: 'v2.0',
          issueRegisterVersion: 'v1.5'
        })
      ).resolves.not.toThrow()
    })
  })

  describe('submitReportForApproval', () => {
    it('should submit report for approval', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { sections: [], overallCompleteness: 95, is_complete: true },
          error: null
        })
        .mockResolvedValueOnce({
          data: { version_no: '1.0' },
          error: null
        })

      mockSupabase.from
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({ data: [{ id: 'report-123' }], error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [{ id: 'approval-1' }], error: null }))
          }))
        })

      const result = await submitReportForApproval('report-123', ['approver-1'])
      expect(result).toBeDefined()
    })
  })
})
