import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestRunCreatePage from '../TestRunCreatePage'
import * as platform from '../../../services/testingCentreService'

vi.mock('../../../services/testingCentreService', () => ({
  hasTestingCentrePermission: vi.fn(),
  listTestSuites: vi.fn(),
  listEnvironments: vi.fn(),
  createTestRun: vi.fn(),
}))

vi.mock('../../../services/simTestingCentreService', () => ({}))

function renderPage() {
  return render(
    <MemoryRouter>
      <TestRunCreatePage pathPrefix="/platform/testing-centre" mode="platform" />
    </MemoryRouter>,
  )
}

describe('TestRunCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.listTestSuites.mockResolvedValue({ success: true, data: [{ id: 's-1', name: 'Smoke suite' }] })
    platform.listEnvironments.mockResolvedValue({ success: true, data: [{ id: 'e-1', name: 'Staging' }] })
  })

  it('explains the missing permission and shows no form when the user cannot run tests', async () => {
    platform.hasTestingCentrePermission.mockResolvedValue(false)
    renderPage()

    expect(await screen.findByText(/need the "execute test runs" permission/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start run' })).toBeNull()
    expect(platform.listTestSuites).not.toHaveBeenCalled()
  })

  it('creates a run for the chosen suite and environment', async () => {
    platform.hasTestingCentrePermission.mockResolvedValue(true)
    platform.createTestRun.mockResolvedValue({ success: true, data: { id: 'run-1', run_code: 'RUN-0001' } })
    renderPage()

    const start = await screen.findByRole('button', { name: 'Start run' })
    expect(start).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Test suite'), { target: { value: 's-1' } })
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'e-1' } })
    expect(start).toBeEnabled()
    fireEvent.click(start)

    await waitFor(() =>
      expect(platform.createTestRun).toHaveBeenCalledWith({ suiteId: 's-1', environmentId: 'e-1' }),
    )
  })

  it('shows the error when the run cannot be created', async () => {
    platform.hasTestingCentrePermission.mockResolvedValue(true)
    platform.createTestRun.mockResolvedValue({ success: false, message: 'new row violates row-level security policy' })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Test suite'), { target: { value: 's-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start run' }))

    expect(await screen.findByText(/could not start the run/i)).toBeInTheDocument()
  })
})
