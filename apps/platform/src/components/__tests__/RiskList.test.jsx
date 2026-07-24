import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RiskList from '../RiskList'

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('RiskList', () => {
  const mockRisks = [
    {
      id: '1',
      risk_title: 'Critical Risk',
      risk_code: 'RISK-001',
      risk_description: 'This is a critical risk',
      risk_type: 'threat',
      probability: 5,
      impact: 5,
      risk_score: 25,
      risk_level: 'critical',
      status: 'identified',
      identified_date: '2025-01-15',
      identified_by: { full_name: 'John Doe', email: 'john@example.com' },
      risk_owner: null,
    },
    {
      id: '2',
      risk_title: 'Medium Risk',
      risk_code: 'RISK-002',
      risk_description: 'This is a medium risk',
      risk_type: 'opportunity',
      probability: 3,
      impact: 3,
      risk_score: 9,
      risk_level: 'medium',
      status: 'assessed',
      identified_date: '2025-01-14',
      identified_by: { full_name: 'Jane Smith', email: 'jane@example.com' },
      risk_owner: { full_name: 'Bob Wilson', email: 'bob@example.com' },
    },
  ]

  const defaultProps = {
    risks: mockRisks,
    onEdit: vi.fn(),
    onRefresh: vi.fn(),
    projectId: 'project-1',
  }

  it('renders risk list with risks', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('Critical Risk')).toBeInTheDocument()
    expect(screen.getByText('Medium Risk')).toBeInTheDocument()
  })

  it('displays risk codes', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('RISK-001')).toBeInTheDocument()
    expect(screen.getByText('RISK-002')).toBeInTheDocument()
  })

  it('displays risk levels correctly', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('displays risk descriptions', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText(/This is a critical risk/i)).toBeInTheDocument()
    expect(screen.getByText(/This is a medium risk/i)).toBeInTheDocument()
  })

  it('shows empty state when no risks', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} risks={[]} />
      </BrowserRouter>
    )
    expect(screen.getByText(/No Risks yet/i)).toBeInTheDocument()
  })

  it('displays risk owner when available', () => {
    render(
      <BrowserRouter>
        <RiskList {...defaultProps} />
      </BrowserRouter>
    )
    expect(screen.getByText(/Bob Wilson/i)).toBeInTheDocument()
  })
})

