import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import StageGateOversight from '../StageGateOversight'

// Mock services
vi.mock('../../../services/stageGateService', () => ({
  getStageGates: vi.fn(),
  getOverdueGates: vi.fn(),
  flagOverdueGate: vi.fn(),
  escalateGate: vi.fn()
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'user-1' } }))
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

import { getStageGates, getOverdueGates } from '../../../services/stageGateService'

describe('StageGateOversight', () => {
  const mockGates = [
    {
      id: 'gate-1',
      gate_name: 'Gate 1',
      stage_name: 'Stage 1',
      planned_date: '2025-01-01',
      status: 'PENDING',
      project: { id: 'proj-1', project_name: 'Test Project' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    getStageGates.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <StageGateOversight organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Stage Gate Oversight/i)).toBeInTheDocument()
  })

  it('displays gates when loaded', async () => {
    getStageGates.mockResolvedValue({ success: true, data: mockGates })
    
    render(
      <BrowserRouter>
        <StageGateOversight organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Gate 1')).toBeInTheDocument()
    })
  })

  it('shows filter dropdown', () => {
    getStageGates.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <StageGateOversight organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/All Gates/i)).toBeInTheDocument()
  })

  it('displays empty state when no gates', async () => {
    getStageGates.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <StageGateOversight organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/No stage gates found/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    getStageGates.mockResolvedValue({ success: false, error: 'Failed to load' })
    
    render(
      <BrowserRouter>
        <StageGateOversight organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading stage gates/i)).toBeInTheDocument()
    })
  })
})
