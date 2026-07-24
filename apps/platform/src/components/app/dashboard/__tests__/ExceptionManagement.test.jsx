import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ExceptionManagement from '../ExceptionManagement'

// Mock services
vi.mock('../../../services/exceptionService', () => ({
  getAllExceptions: vi.fn(),
  escalateException: vi.fn(),
  resolveException: vi.fn()
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

import { getAllExceptions } from '../../../services/exceptionService'

describe('ExceptionManagement', () => {
  const mockExceptions = [
    {
      id: 'exc-1',
      exception_title: 'Test Exception',
      exception_reason: 'Test reason',
      exception_level: 'HIGH',
      exception_status: 'OPEN',
      project: { id: 'proj-1', project_name: 'Test Project' }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    getAllExceptions.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <ExceptionManagement organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Exception Management/i)).toBeInTheDocument()
  })

  it('displays exceptions when loaded', async () => {
    getAllExceptions.mockResolvedValue({ success: true, data: mockExceptions })
    
    render(
      <BrowserRouter>
        <ExceptionManagement organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Exception')).toBeInTheDocument()
    })
  })

  it('shows raise exception button', () => {
    getAllExceptions.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <ExceptionManagement organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/Raise Exception/i)).toBeInTheDocument()
  })

  it('displays empty state when no exceptions', async () => {
    getAllExceptions.mockResolvedValue({ success: true, data: [] })
    
    render(
      <BrowserRouter>
        <ExceptionManagement organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/No exceptions found/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    getAllExceptions.mockResolvedValue({ success: false, error: 'Failed to load' })
    
    render(
      <BrowserRouter>
        <ExceptionManagement organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading exceptions/i)).toBeInTheDocument()
    })
  })
})
