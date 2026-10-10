import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestRunsPage from '../TestRunsPage'
import * as platform from '../../../services/testingCentreService'

vi.mock('../../../services/testingCentreService', () => ({
  listTestRuns: vi.fn(),
}))

vi.mock('../../../services/simTestingCentreService', () => ({}))

function renderPage() {
  return render(
    <MemoryRouter>
      <TestRunsPage pathPrefix="/platform/testing-centre" mode="platform" />
    </MemoryRouter>,
  )
}

describe('TestRunsPage — empty and error states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty-state message when there are no runs', async () => {
    platform.listTestRuns.mockResolvedValue({ success: true, data: [] })
    renderPage()

    expect(await screen.findByText(/no test runs yet/i)).toBeInTheDocument()
  })

  it('shows the error message when loading runs fails', async () => {
    platform.listTestRuns.mockResolvedValue({ success: false, message: 'insufficient permission' })
    renderPage()

    expect(await screen.findByText(/could not load test runs/i)).toBeInTheDocument()
    expect(screen.getByText(/insufficient permission/i)).toBeInTheDocument()
  })

  it('lists runs when they exist', async () => {
    platform.listTestRuns.mockResolvedValue({
      success: true,
      data: [{ id: 'r-1', run_code: 'RUN-0001', run_status: 'completed' }],
    })
    renderPage()

    expect(await screen.findByText('RUN-0001')).toBeInTheDocument()
    expect(screen.queryByText(/no test runs yet/i)).toBeNull()
  })
})
