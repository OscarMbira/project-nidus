import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PMOControlStrip from '../PMOControlStrip'

// Mock services
vi.mock('../../../services/pmoAdminService', () => ({
  getPMOControlStripData: vi.fn()
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [] }))
            }))
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

import { getPMOControlStripData } from '../../../services/pmoAdminService'

describe('PMOControlStrip', () => {
  const mockData = {
    projects_requiring_attention: 5,
    projects_in_exception: 3,
    overdue_stage_gates: 2,
    pm_capacity_breaches: 1,
    orphan_projects: 4
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    getPMOControlStripData.mockResolvedValue({ success: true, data: mockData })
    
    render(
      <BrowserRouter>
        <PMOControlStrip organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/PMO Control Strip/i)).toBeInTheDocument()
  })

  it('displays all 5 intervention signals', async () => {
    getPMOControlStripData.mockResolvedValue({ success: true, data: mockData })
    
    render(
      <BrowserRouter>
        <PMOControlStrip organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Projects Requiring Attention/i)).toBeInTheDocument()
      expect(screen.getByText(/Projects in Exception/i)).toBeInTheDocument()
      expect(screen.getByText(/Overdue Stage Gates/i)).toBeInTheDocument()
      expect(screen.getByText(/PM Capacity Breaches/i)).toBeInTheDocument()
      expect(screen.getByText(/Orphan Projects/i)).toBeInTheDocument()
    })
  })

  it('displays correct counts', async () => {
    getPMOControlStripData.mockResolvedValue({ success: true, data: mockData })
    
    render(
      <BrowserRouter>
        <PMOControlStrip organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    getPMOControlStripData.mockResolvedValue({ success: false, error: 'Failed to load' })
    
    render(
      <BrowserRouter>
        <PMOControlStrip organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading PMO Control Strip/i)).toBeInTheDocument()
    })
  })

  it('handles empty data', async () => {
    getPMOControlStripData.mockResolvedValue({ 
      success: true, 
      data: {
        projects_requiring_attention: 0,
        projects_in_exception: 0,
        overdue_stage_gates: 0,
        pm_capacity_breaches: 0,
        orphan_projects: 0
      }
    })
    
    render(
      <BrowserRouter>
        <PMOControlStrip organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    })
  })
})
