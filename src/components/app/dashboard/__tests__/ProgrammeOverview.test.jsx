import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProgrammeOverview from '../ProgrammeOverview'

// Mock services
vi.mock('../../../services/programmeService', () => ({
  getProgramme: vi.fn(),
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

import { getProgramme, getAllProgrammeRollups } from '../../../services/programmeService'

describe('ProgrammeOverview', () => {
  const mockProgrammes = [
    {
      id: 'prog-1',
      programme_name: 'Test Programme 1',
      programme_code: 'PROG-001',
      programme_status: 'active',
      rag_status: 'green'
    }
  ]

  const mockRollups = [
    {
      programme_id: 'prog-1',
      total_projects: 5,
      active_projects: 3,
      total_budget: 100000,
      total_spent: 50000
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    getProgramme.mockResolvedValue(mockProgrammes[0])
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: mockRollups })
    
    render(
      <BrowserRouter>
        <ProgrammeOverview organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Programmes/i)).toBeInTheDocument()
  })

  it('displays programmes when loaded', async () => {
    getProgramme.mockResolvedValue(mockProgrammes[0])
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: mockRollups })
    
    render(
      <BrowserRouter>
        <ProgrammeOverview organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Programme 1')).toBeInTheDocument()
    })
  })

  it('shows create programme button', () => {
    getProgramme.mockResolvedValue(mockProgrammes[0])
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <ProgrammeOverview organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Create Programme/i)).toBeInTheDocument()
  })

  it('displays empty state when no programmes', async () => {
    getProgramme.mockResolvedValue(null)
    getAllProgrammeRollups.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <ProgrammeOverview organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/No programmes found/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    getProgramme.mockRejectedValue(new Error('Failed to load'))
    
    render(
      <BrowserRouter>
        <ProgrammeOverview organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading programmes/i)).toBeInTheDocument()
    })
  })
})
