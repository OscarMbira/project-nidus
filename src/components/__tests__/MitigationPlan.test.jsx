import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MitigationPlan from '../MitigationPlan'

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
            mitigation_action: 'Implement backup system',
            mitigation_description: 'Set up automated backups',
            mitigation_type: 'preventive',
            status: 'planned',
            assigned_to: { full_name: 'John Doe', email: 'john@example.com' },
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

describe('MitigationPlan', () => {
  const defaultProps = {
    riskId: 'risk-1',
    projectId: 'project-1',
    onUpdate: vi.fn(),
  }

  it('renders mitigation plans title', async () => {
    render(<MitigationPlan {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Mitigation Plans/i)).toBeInTheDocument()
    })
  })

  it('displays add mitigation button', async () => {
    render(<MitigationPlan {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Add Mitigation/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no mitigations', async () => {
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

    render(<MitigationPlan {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/No mitigation plans yet/i)).toBeInTheDocument()
    })
  })
})

