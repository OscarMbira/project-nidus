/**
 * PMORFPCreate Page Tests
 * Tests redirect when user is not PMO Admin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PMORFPCreate from '../PMORFPCreate'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../services/rfpService', () => ({
  checkPMOAdminRole: vi.fn(),
}))

vi.mock('../../../context/ToastContext', () => ({
  useToastContext: () => ({ error: vi.fn() }),
}))

vi.mock('../../../components/rfp/RFPForm', () => ({
  default: () => <div data-testid="rfp-form">RFP Form</div>,
}))

import * as rfpService from '../../../services/rfpService'

describe('PMORFPCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rfpService.checkPMOAdminRole).mockResolvedValue(true)
  })

  it('renders RFP Form when user is PMO Admin', async () => {

    render(
      <BrowserRouter>
        <PMORFPCreate />
      </BrowserRouter>
    )

    expect(await screen.findByTestId('rfp-form')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('redirects to RFP list when user is not PMO Admin', async () => {
    vi.mocked(rfpService.checkPMOAdminRole).mockResolvedValue(false)

    render(
      <BrowserRouter>
        <PMORFPCreate />
      </BrowserRouter>
    )

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pmo/procurement/rfp', { replace: true })
    }, { timeout: 1000 })
  })
})
