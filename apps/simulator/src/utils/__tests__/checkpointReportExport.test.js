/**
 * Checkpoint Report Export Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportCheckpointReportToPDF, exportCheckpointReportToWord } from '../checkpointReportExport'

describe('Checkpoint Report Export Utilities', () => {
  let mockWindow

  beforeEach(() => {
    // Mock window.open
    mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn()
      },
      print: vi.fn(),
      focus: vi.fn()
    }
    window.open = vi.fn(() => mockWindow)
    window.URL = {
      createObjectURL: vi.fn(() => 'blob:url'),
      revokeObjectURL: vi.fn()
    }
    document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn()
    }))
    document.body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('exportCheckpointReportToPDF', () => {
    it('should open print window for PDF export', async () => {
      const report = {
        id: 'report-123',
        report_title: 'Test Report',
        document_ref: 'CPR-PROJ001-WP01-001',
        version_no: '1.0',
        checkpoint_date: '2026-01-20',
        report_summary: 'Test summary',
        status: 'draft'
      }

      await exportCheckpointReportToPDF(report)

      expect(window.open).toHaveBeenCalledWith('', '_blank')
      expect(mockWindow.document.write).toHaveBeenCalled()
      expect(mockWindow.document.close).toHaveBeenCalled()
    })

    it('should handle pop-up blocker', async () => {
      window.open = vi.fn(() => null)

      const report = {
        id: 'report-123',
        report_title: 'Test Report'
      }

      // Mock alert
      window.alert = vi.fn()

      await exportCheckpointReportToPDF(report)

      expect(window.alert).toHaveBeenCalledWith('Please allow pop-ups to export PDF')
    })
  })

  describe('exportCheckpointReportToWord', () => {
    it('should create and download Word document', async () => {
      const report = {
        id: 'report-123',
        report_title: 'Test Report',
        document_ref: 'CPR-PROJ001-WP01-001',
        version_no: '1.0',
        checkpoint_date: '2026-01-20',
        report_summary: 'Test summary',
        status: 'draft'
      }

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }

      document.createElement.mockReturnValueOnce(mockLink)

      await exportCheckpointReportToWord(report)

      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockLink.download).toContain('.doc')
      expect(mockLink.click).toHaveBeenCalled()
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
      expect(window.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('should generate correct filename', async () => {
      const report = {
        document_ref: 'CPR-PROJ001-WP01-001',
        checkpoint_date: '2026-01-20'
      }

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }

      document.createElement.mockReturnValueOnce(mockLink)

      await exportCheckpointReportToWord(report)

      expect(mockLink.download).toContain('CPR-PROJ001-WP01-001')
      expect(mockLink.download).toContain('2026-01-20')
      expect(mockLink.download).toContain('.doc')
    })
  })
})
