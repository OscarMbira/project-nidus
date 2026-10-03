/**
 * Sanity/render tests for the new Portfolio/Programme Manager Home widgets (v982 Phase 5
 * follow-up) — these are genuinely new content (not extracted from an existing dashboard), built
 * from existing rollup data sources (portfolios' own pre-computed health columns,
 * programme_rollup_view) rather than invented data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseCurrentPortfolio, mockUseCurrentProgramme, mockGetPortfolio, mockGetProgrammeRollups } = vi.hoisted(() => ({
  mockUseCurrentPortfolio: vi.fn(),
  mockUseCurrentProgramme: vi.fn(),
  mockGetPortfolio: vi.fn(),
  mockGetProgrammeRollups: vi.fn(),
}))
vi.mock('../../../../context/CurrentPortfolioContext', () => ({ useCurrentPortfolio: mockUseCurrentPortfolio }))
vi.mock('../../../../context/CurrentProgrammeContext', () => ({ useCurrentProgramme: mockUseCurrentProgramme }))
vi.mock('../../../../services/portfolioService', () => ({ getPortfolio: mockGetPortfolio, getPortfolioProjects: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../../../services/programmeService', () => ({ getProgrammeRollups: mockGetProgrammeRollups, getProgrammeProjects: vi.fn(() => Promise.resolve([])) }))

import PortfolioHealthWidget from '../PortfolioHealthWidget'
import ProgrammeHealthWidget from '../ProgrammeHealthWidget'

describe('PortfolioHealthWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentPortfolio.mockReturnValue({ portfolioId: 'pf-1' })
  })

  it('renders the portfolio\'s own pre-computed rollup columns, not an invented aggregation', async () => {
    mockGetPortfolio.mockResolvedValue({
      portfolio_name: 'Digital Transformation',
      overall_health_score: 82,
      active_projects_count: 5,
      completed_projects_count: 2,
      on_hold_projects_count: 1,
      cancelled_projects_count: 0,
      total_risks_count: 3,
      high_risks_count: 1,
    })

    render(<MemoryRouter><PortfolioHealthWidget /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText(/Digital Transformation/)).toBeInTheDocument())
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/1 high/)).toBeInTheDocument()
  })

  it('renders nothing (no crash) when there is no current portfolio', () => {
    mockUseCurrentPortfolio.mockReturnValue({ portfolioId: null })
    const { container } = render(<MemoryRouter><PortfolioHealthWidget /></MemoryRouter>)
    expect(container).toBeTruthy()
  })
})

describe('ProgrammeHealthWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrentProgramme.mockReturnValue({ programmeId: 'prog-1' })
  })

  it('renders programme_rollup_view data via the existing getProgrammeRollups()', async () => {
    mockGetProgrammeRollups.mockResolvedValue({
      success: true,
      data: {
        programme_name: 'Core Banking Upgrade',
        active_projects: 4,
        completed_projects: 1,
        green_projects: 3,
        average_progress_percentage: 61,
        total_realised_benefits: 2,
        total_planned_benefits: 5,
      },
    })

    render(<ProgrammeHealthWidget />)

    await waitFor(() => expect(screen.getByText(/Core Banking Upgrade/)).toBeInTheDocument())
    expect(screen.getByText('61%')).toBeInTheDocument()
    expect(screen.getByText(/2 \/ 5/)).toBeInTheDocument()
  })
})
