import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BenefitsRollup from '../BenefitsRollup'

// Mock services
vi.mock('../../../services/programmeService', () => ({
  getAllProgrammeRollups: vi.fn()
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [] }))
          }))
        }))
      }))
    }))
  }
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

import { getAllProgrammeRollups } from '../../../services/programmeService'

describe('BenefitsRollup', () => {
  const mockRollups = [
    {
      programme_id: 'prog-1',
      programme_name: 'Test Programme',
      programme_code: 'PROG-001',
      total_planned_benefits: 100000,
      total_forecast_benefits: 90000,
      total_realised_benefits: 80000
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <BenefitsRollup organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Benefits Roll-up/i)).toBeInTheDocument()
  })

  it('displays programme benefits when loaded', async () => {
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: mockRollups })
    
    render(
      <BrowserRouter>
        <BenefitsRollup organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Programme')).toBeInTheDocument()
    })
  })

  it('shows level selector', () => {
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <BenefitsRollup organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Project Level/i)).toBeInTheDocument()
    expect(screen.getByText(/Programme Level/i)).toBeInTheDocument()
  })

  it('displays empty state when no benefits', async () => {
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <BenefitsRollup organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/No programme benefits found/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    getAllProgrammeRollups.mockResolvedValue({ success: false, error: 'Failed to load' })
    
    render(
      <BrowserRouter>
        <BenefitsRollup organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading benefits/i)).toBeInTheDocument()
    })
  })
})
