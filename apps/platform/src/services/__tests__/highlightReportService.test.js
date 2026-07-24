/**
 * Highlight Report Service Tests
 * Tests for controllingStageService highlight report methods and highlightReport* services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getHighlightReports,
  createHighlightReport,
  updateHighlightReport,
  deleteHighlightReport,
  getHighlightReportById,
  getLatestHighlightReport,
  validateReportCompleteness,
  generateReportReference
} from '../controllingStageService'

const mockSupabase = {
  auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-123' } } })) },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }))

// Mock users lookup
const mockUser = { id: 'user-456', full_name: 'Test User', email: 'test@test.com' }

describe('Highlight Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-123' } } })
  })

  describe('getHighlightReports', () => {
    it('returns highlight reports for project', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [{ id: 'r1', report_title: 'HLR 1' }],
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await getHighlightReports('proj-1')
      expect(result).toHaveLength(1)
      expect(result[0].report_title).toBe('HLR 1')
    })
  })

  describe('getHighlightReportById', () => {
    it('returns single report by id', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'r1', report_title: 'HLR 1' },
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await getHighlightReportById('r1')
      expect(result).toBeDefined()
      expect(result.id).toBe('r1')
      expect(result.report_title).toBe('HLR 1')
    })
  })

  describe('createHighlightReport', () => {
    it('creates report with user resolved from auth', async () => {
      const insertChain = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'new-1', report_title: 'New HLR' },
              error: null
            }))
          }))
        }))
      }
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUser, error: null }))
              }))
            }))
          }
        }
        if (table === 'highlight_reports') return insertChain
        return {}
      })

      const result = await createHighlightReport('proj-1', { report_title: 'New HLR' }, null)
      expect(result).toBeDefined()
      expect(result.id).toBe('new-1')
    })
  })

  describe('validateReportCompleteness', () => {
    it('calls RPC and returns array', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { section_name: 'document_info', is_complete: true, completeness_percentage: 100 },
          { section_name: 'executive_summary', is_complete: false, completeness_percentage: 0 }
        ],
        error: null
      })

      const result = await validateReportCompleteness('r1')
      expect(Array.isArray(result)).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_highlight_report_completeness', { p_report_id: 'r1' })
    })
  })
})
