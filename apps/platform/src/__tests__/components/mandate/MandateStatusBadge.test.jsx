/**
 * Component Tests for MandateStatusBadge
 */

import { render, screen } from '@testing-library/react'
import MandateStatusBadge from '../../../components/mandate/MandateStatusBadge'

describe('MandateStatusBadge', () => {
  it('should render approved status badge', () => {
    render(<MandateStatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('should render draft status badge', () => {
    render(<MandateStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('should render submitted status badge', () => {
    render(<MandateStatusBadge status="submitted" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('should render rejected status badge', () => {
    render(<MandateStatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('should show practice indicator when isPractice is true', () => {
    render(<MandateStatusBadge status="draft" isPractice={true} />)
    expect(screen.getByText('(Practice)')).toBeInTheDocument()
  })

  it('should use default style for unknown status', () => {
    render(<MandateStatusBadge status="unknown" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })
})
