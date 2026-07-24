/**
 * Product Status Account Card Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProductStatusAccountCard from '../ProductStatusAccountCard'

const mockPSA = {
  id: 'psa-123',
  psa_reference: 'PSA-2026-001',
  product_name: 'Test Product',
  product_reference: 'PROD-001',
  current_status: 'in_progress',
  progress_percentage: 50,
  progress_indicator: 'on_track',
  has_issues: false,
  has_blockers: false,
  planned_completion_date: '2026-02-01',
  schedule_variance_days: 0
}

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('ProductStatusAccountCard', () => {
  it('should render product name', () => {
    renderWithRouter(<ProductStatusAccountCard psa={mockPSA} projectId="project-123" />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })

  it('should render PSA reference', () => {
    renderWithRouter(<ProductStatusAccountCard psa={mockPSA} projectId="project-123" />)
    expect(screen.getByText(/PSA-2026-001/)).toBeInTheDocument()
  })

  it('should render current status', () => {
    renderWithRouter(<ProductStatusAccountCard psa={mockPSA} projectId="project-123" />)
    expect(screen.getByText(/in progress/i)).toBeInTheDocument()
  })

  it('should render progress percentage', () => {
    renderWithRouter(<ProductStatusAccountCard psa={mockPSA} projectId="project-123" />)
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('should render progress indicator', () => {
    renderWithRouter(<ProductStatusAccountCard psa={mockPSA} projectId="project-123" />)
    expect(screen.getByText(/on track/i)).toBeInTheDocument()
  })

  it('should display blockers when present', () => {
    const psaWithBlockers = {
      ...mockPSA,
      has_blockers: true,
      blocker_count: 2
    }
    renderWithRouter(<ProductStatusAccountCard psa={psaWithBlockers} projectId="project-123" />)
    expect(screen.getByText(/2 Blocker/i)).toBeInTheDocument()
  })

  it('should display issues when present', () => {
    const psaWithIssues = {
      ...mockPSA,
      has_issues: true,
      issue_count: 3
    }
    renderWithRouter(<ProductStatusAccountCard psa={psaWithIssues} projectId="project-123" />)
    expect(screen.getByText(/3 Issue/i)).toBeInTheDocument()
  })

  it('should render schedule variance when present', () => {
    const psaWithVariance = {
      ...mockPSA,
      schedule_variance_days: 5
    }
    renderWithRouter(<ProductStatusAccountCard psa={psaWithVariance} projectId="project-123" />)
    expect(screen.getByText(/\+5 days/)).toBeInTheDocument()
  })
})
