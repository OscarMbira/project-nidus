/**
 * RFPDetailView Component Tests
 * Tests role-based UI: Edit/Delete buttons hidden when readOnly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, useParams } from 'react-router-dom'
import RFPDetailView from '../RFPDetailView'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'rfp-1' }),
    useNavigate: () => vi.fn(),
  }
})

const mockRfpService = {
  getRFPById: vi.fn(),
  getLineItems: vi.fn(),
  getAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
  updateRFPStatus: vi.fn(),
  deleteRFP: vi.fn(),
}

describe('RFPDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRfpService.getRFPById.mockResolvedValue({
      id: 'rfp-1',
      rfp_title: 'Test RFP',
      rfp_reference: 'RFP-2026-001',
      status: 'draft',
      rfp_category: 'IT',
      service_provider_name: 'Acme',
    })
    mockRfpService.getLineItems.mockResolvedValue([])
    mockRfpService.getAttachments.mockResolvedValue([])
  })

  it('shows Edit and Delete buttons when readOnly is false', async () => {
    render(
      <BrowserRouter>
        <RFPDetailView readOnly={false} rfpService={mockRfpService} />
      </BrowserRouter>
    )
    expect(await screen.findByText('Test RFP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
  })

  it('hides Edit and Delete buttons when readOnly is true', async () => {
    render(
      <BrowserRouter>
        <RFPDetailView readOnly={true} rfpService={mockRfpService} />
      </BrowserRouter>
    )
    expect(await screen.findByText('Test RFP')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument()
  })

  it('always shows Print and Export CSV buttons', async () => {
    render(
      <BrowserRouter>
        <RFPDetailView readOnly={true} rfpService={mockRfpService} />
      </BrowserRouter>
    )
    expect(await screen.findByText('Test RFP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
  })
})
