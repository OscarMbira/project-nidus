import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SimStageGateReview from '../SimStageGateReview'

const mocks = vi.hoisted(() => ({
  loadCompliance: vi.fn().mockResolvedValue({
    canAdvance: false,
    missing: [{ description: 'Project brief approved', is_mandatory: true }],
  }),
}))

vi.mock('../../../services/sim/simStageGateService', () => ({
  loadCompliance: mocks.loadCompliance,
  recordBoardDecision: vi.fn().mockResolvedValue({ success: true }),
  createStageGateReview: vi.fn().mockResolvedValue({ success: true, data: { id: 'rev-1' } }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ runId: 'run-1', stageName: 'initiation' }),
  }
})

describe('SimStageGateReview', () => {
  beforeEach(() => {
    mocks.loadCompliance.mockClear()
  })

  it('shows mandatory checklist items from compliance', async () => {
    render(
      <BrowserRouter>
        <SimStageGateReview />
      </BrowserRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/Project brief approved/i)).toBeInTheDocument()
      expect(screen.getByText(/\(required\)/i)).toBeInTheDocument()
    })
  })

  it('refresh triggers loadCompliance again', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <SimStageGateReview />
      </BrowserRouter>,
    )
    await waitFor(() => expect(mocks.loadCompliance).toHaveBeenCalled())
    const n = mocks.loadCompliance.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Refresh checklist/i }))
    await waitFor(() => expect(mocks.loadCompliance.mock.calls.length).toBeGreaterThan(n))
  })
})
