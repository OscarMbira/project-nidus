import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PMCapacityWidget from '../PMCapacityWidget'

// Mock services
vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [] }))
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

describe('PMCapacityWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <PMCapacityWidget organizationId="org-1" />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/PM Capacity/i)).toBeInTheDocument()
  })

  it('displays empty state when no PMs', async () => {
    const { platformDb } = await import('../../../services/supabase/supabaseClient')
    platformDb.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [] }))
          }))
        }))
      }))
    })
    
    render(
      <BrowserRouter>
        <PMCapacityWidget organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/No Project Managers found/i)).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    const { platformDb } = await import('../../../services/supabase/supabaseClient')
    platformDb.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.reject(new Error('Failed to load')))
      }))
    })
    
    render(
      <BrowserRouter>
        <PMCapacityWidget organizationId="org-1" />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading PM capacity/i)).toBeInTheDocument()
    })
  })
})
