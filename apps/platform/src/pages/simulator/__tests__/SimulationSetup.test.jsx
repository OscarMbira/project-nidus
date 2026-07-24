import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SimulationSetup from '../SimulationSetup'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../services/supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'sc1',
                name: 'NPC scenario',
                short_description: 'Test',
                methodology: 'traditional',
                difficulty_level: 'standard',
                scenario_data: { v505: true },
                is_active: true,
                sort_order: 1,
              },
            ],
            error: null,
          }),
        })),
      })),
    })),
  },
}))

vi.mock('../../../services/sim/simRunBootstrapService', () => ({
  startSimulationRun: vi.fn().mockResolvedValue({ success: true, runId: 'run-x' }),
}))

describe('SimulationSetup', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders wizard title', async () => {
    render(
      <BrowserRouter>
        <SimulationSetup />
      </BrowserRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Live simulation setup/i })).toBeInTheDocument()
    })
  })

  it('advances step navigation', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SimulationSetup />
      </BrowserRouter>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByRole('button', { name: /project sponsor/i })).toBeInTheDocument()
  })
})
