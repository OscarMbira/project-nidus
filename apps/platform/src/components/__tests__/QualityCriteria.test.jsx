import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QualityCriteria from '../structured/QualityCriteria'

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            criteria_name: 'Code Quality',
            criteria_description: 'Code must pass linting',
            criteria_type: 'functional',
            status: 'pending',
            quality_standard: 'Company Standard',
          },
        ],
        error: null,
      }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
      }),
    },
  },
}))

describe('QualityCriteria', () => {
  const defaultProps = {
    productId: 'product-1',
    projectId: 'project-1',
  }

  it('renders quality criteria title', async () => {
    render(<QualityCriteria {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Quality Criteria/i)).toBeInTheDocument()
    })
  })

  it('displays add criterion button', async () => {
    render(<QualityCriteria {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Add Criterion/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no criteria', async () => {
    // Mock empty response
    vi.mock('../../services/supabaseClient', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      },
    }))

    render(<QualityCriteria {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/No quality criteria defined yet/i)).toBeInTheDocument()
    })
  })
})

