import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SimEventInbox from '../SimEventInbox'

vi.mock('../../../components/sim/EventModal', () => ({
  default: () => null,
}))

vi.mock('../../../services/sim/simNPCEngineService', () => ({
  getPendingEvents: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: 'e1', event_name: 'Risk surfaced', npc_character_id: null }],
    error: null,
  }),
  scoreEventResponse: vi.fn(),
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ runId: 'run-1' }),
  }
})

describe('SimEventInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders inbox heading and pending row', async () => {
    render(
      <BrowserRouter>
        <SimEventInbox />
      </BrowserRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Event inbox/i })).toBeInTheDocument()
      expect(screen.getByText(/Risk surfaced/i)).toBeInTheDocument()
    })
  })

  it('toggles resolved filter', async () => {
    render(
      <BrowserRouter>
        <SimEventInbox />
      </BrowserRouter>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /resolved/i })).toBeInTheDocument())
    await screen.getByRole('button', { name: /resolved/i }).click()
    await waitFor(() => expect(screen.queryByText(/Risk surfaced/i)).not.toBeInTheDocument())
  })
})
