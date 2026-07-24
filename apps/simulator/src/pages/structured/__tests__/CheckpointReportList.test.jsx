/**
 * Checkpoint Report List Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CheckpointReportList from '../CheckpointReportList'

// Mock useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'project-123', workPackageId: 'wp-123' }),
    useNavigate: () => vi.fn()
  }
})

// Mock service
vi.mock('../../services/checkpointReportService', () => ({
  getCheckpointReportsByWorkPackage: vi.fn()
}))

describe('CheckpointReportList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders checkpoint reports list', async () => {
    const { getCheckpointReportsByWorkPackage } = await import('../../services/checkpointReportService')
    const mockReports = [
      {
        id: 'report-1',
        report_title: 'Checkpoint Report 1',
        document_ref: 'CPR-PROJ001-WP01-001',
        version_no: '1.0',
        checkpoint_date: '2026-01-20',
        status: 'draft',
        report_summary: 'Summary 1'
      },
      {
        id: 'report-2',
        report_title: 'Checkpoint Report 2',
        document_ref: 'CPR-PROJ001-WP01-002',
        version_no: '1.0',
        checkpoint_date: '2026-01-21',
        status: 'approved',
        report_summary: 'Summary 2'
      }
    ]

    getCheckpointReportsByWorkPackage.mockResolvedValueOnce(mockReports)

    render(
      <BrowserRouter>
        <CheckpointReportList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Checkpoint Report 1')).toBeInTheDocument()
      expect(screen.getByText('Checkpoint Report 2')).toBeInTheDocument()
    })
  })

  it('displays empty state when no reports', async () => {
    const { getCheckpointReportsByWorkPackage } = await import('../../services/checkpointReportService')
    getCheckpointReportsByWorkPackage.mockResolvedValueOnce([])

    render(
      <BrowserRouter>
        <CheckpointReportList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No checkpoint reports found')).toBeInTheDocument()
    })
  })

  it('filters reports by status', async () => {
    const { getCheckpointReportsByWorkPackage } = await import('../../services/checkpointReportService')
    const mockReports = [
      { id: 'report-1', status: 'draft', report_title: 'Draft Report' },
      { id: 'report-2', status: 'approved', report_title: 'Approved Report' }
    ]

    getCheckpointReportsByWorkPackage.mockResolvedValueOnce(mockReports)

    render(
      <BrowserRouter>
        <CheckpointReportList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(getCheckpointReportsByWorkPackage).toHaveBeenCalled()
    })
  })

  it('searches reports by title', async () => {
    const { getCheckpointReportsByWorkPackage } = await import('../../services/checkpointReportService')
    const mockReports = [
      { id: 'report-1', report_title: 'Weekly Report', status: 'draft' },
      { id: 'report-2', report_title: 'Monthly Report', status: 'draft' }
    ]

    getCheckpointReportsByWorkPackage.mockResolvedValueOnce(mockReports)

    render(
      <BrowserRouter>
        <CheckpointReportList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search reports...')).toBeInTheDocument()
    })
  })
})
