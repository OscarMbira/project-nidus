/**
 * Checkpoint Quality Criteria Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckpointQualityCriteria from '../CheckpointQualityCriteria'

// Mock services
vi.mock('../../services/checkpointReportQualityService', () => ({
  getQualityChecks: vi.fn(),
  updateQualityCheck: vi.fn()
}))

const mockQualityChecks = [
  {
    id: 'check-1',
    criterion_number: 1,
    criterion_name: 'Prepared at required frequency',
    criterion_description: 'Report must be prepared at the required frequency',
    validation_status: 'passed',
    is_blocking: true,
    is_automated: true
  },
  {
    id: 'check-2',
    criterion_number: 2,
    criterion_name: 'Level and frequency appropriate',
    validation_status: 'failed',
    is_blocking: true,
    is_automated: false
  }
]

describe('CheckpointQualityCriteria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quality criteria list', async () => {
    const { getQualityChecks } = await import('../../services/checkpointReportQualityService')
    getQualityChecks.mockResolvedValueOnce(mockQualityChecks)

    render(<CheckpointQualityCriteria reportId="report-123" mode="view" />)

    await waitFor(() => {
      expect(screen.getByText('Criterion 1: Prepared at required frequency')).toBeInTheDocument()
      expect(screen.getByText('Criterion 2: Level and frequency appropriate')).toBeInTheDocument()
    })
  })

  it('displays quality check status correctly', async () => {
    const { getQualityChecks } = await import('../../services/checkpointReportQualityService')
    getQualityChecks.mockResolvedValueOnce(mockQualityChecks)

    render(<CheckpointQualityCriteria reportId="report-123" mode="view" />)

    await waitFor(() => {
      expect(screen.getByText('passed')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })
  })

  it('shows blocking indicator for blocking criteria', async () => {
    const { getQualityChecks } = await import('../../services/checkpointReportQualityService')
    getQualityChecks.mockResolvedValueOnce(mockQualityChecks)

    render(<CheckpointQualityCriteria reportId="report-123" mode="view" />)

    await waitFor(() => {
      expect(screen.getAllByText('Blocking')).toHaveLength(2)
    })
  })

  it('allows marking check as passed in edit mode', async () => {
    const user = userEvent.setup()
    const { getQualityChecks, updateQualityCheck } = await import('../../services/checkpointReportQualityService')
    getQualityChecks.mockResolvedValueOnce(mockQualityChecks)
    updateQualityCheck.mockResolvedValueOnce({})

    render(<CheckpointQualityCriteria reportId="report-123" mode="edit" />)

    await waitFor(() => {
      expect(screen.getByText('Mark Passed')).toBeInTheDocument()
    })

    const markPassedButton = screen.getAllByText('Mark Passed')[0]
    await user.click(markPassedButton)

    await waitFor(() => {
      expect(updateQualityCheck).toHaveBeenCalled()
    })
  })

  it('allows manual override with reason', async () => {
    const user = userEvent.setup()
    window.prompt = vi.fn(() => 'Override reason')

    const { getQualityChecks, updateQualityCheck } = await import('../../services/checkpointReportQualityService')
    getQualityChecks.mockResolvedValueOnce(mockQualityChecks)
    updateQualityCheck.mockResolvedValueOnce({})

    render(<CheckpointQualityCriteria reportId="report-123" mode="edit" />)

    await waitFor(() => {
      expect(screen.getByText('Manual Override')).toBeInTheDocument()
    })

    const overrideButton = screen.getAllByText('Manual Override')[0]
    await user.click(overrideButton)

    expect(window.prompt).toHaveBeenCalled()
  })
})
