/**
 * PMORFPBulkImport Page Tests
 * Tests redirect when user is not PMO Admin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PMORFPBulkImport from '../PMORFPBulkImport'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'rfp-1' }),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../services/rfpService', () => ({
  checkPMOAdminRole: vi.fn(),
}))

vi.mock('../../../context/ToastContext', () => ({
  useToastContext: () => ({
    error: vi.fn(),
  }),
}))

vi.mock('../../../components/rfp/RFPBulkImport', () => ({
  default: () => <div data-testid="rfp-bulk-import">RFP Bulk Import</div>,
}))

import * as rfpService from '../../../services/rfpService'

describe('PMORFPBulkImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rfpService.checkPMOAdminRole).mockResolvedValue(true)
  })

  it('renders RFPBulkImport when user is PMO Admin', async () => {

    render(
      <BrowserRouter>
        <PMORFPBulkImport />
      </BrowserRouter>
    )

    expect(await screen.findByTestId('rfp-bulk-import')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('redirects to RFP view when user is not PMO Admin', async () => {
    vi.mocked(rfpService.checkPMOAdminRole).mockResolvedValue(false)

    render(
      <BrowserRouter>
        <PMORFPBulkImport />
      </BrowserRouter>
    )

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pmo/rfp/rfp-1/view', { replace: true })
    }, { timeout: 500 })
  })
})
