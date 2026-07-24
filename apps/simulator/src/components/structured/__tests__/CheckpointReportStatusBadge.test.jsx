/**
 * Checkpoint Report Status Badge Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CheckpointReportStatusBadge from '../CheckpointReportStatusBadge'

describe('CheckpointReportStatusBadge', () => {
  it('renders draft status badge', () => {
    render(<CheckpointReportStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders submitted status badge', () => {
    render(<CheckpointReportStatusBadge status="submitted" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders approved status badge', () => {
    render(<CheckpointReportStatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders rejected status badge', () => {
    render(<CheckpointReportStatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<CheckpointReportStatusBadge status="draft" size="sm" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()

    rerender(<CheckpointReportStatusBadge status="draft" size="lg" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('handles unknown status gracefully', () => {
    render(<CheckpointReportStatusBadge status="unknown" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('handles null status', () => {
    render(<CheckpointReportStatusBadge status={null} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
