/**
 * RFPList Component Tests - role-based UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RFPList from '../RFPList'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../../../services/rfpService', () => ({
  getRFPList: vi.fn().mockResolvedValue([]),
  getRFPStats: vi.fn().mockResolvedValue({ total: 0, draft: 0, active: 0, closed: 0, on_hold: 0, total_line_items: 0 }),
  deleteRFP: vi.fn(),
}))

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'ur1' } }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acc1' } }),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}))

describe('RFPList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows Load RFP when readOnly is false', async () => {
    render(<BrowserRouter><RFPList readOnly={false} /></BrowserRouter>)
    expect(await screen.findByRole('button', { name: /Load RFP/i })).toBeInTheDocument()
  })

  it('hides Load RFP when readOnly is true', async () => {
    render(<BrowserRouter><RFPList readOnly={true} /></BrowserRouter>)
    await screen.findByText(/RFP Document Register/i)
    expect(screen.queryByRole('button', { name: /Load RFP/i })).not.toBeInTheDocument()
  })
})
