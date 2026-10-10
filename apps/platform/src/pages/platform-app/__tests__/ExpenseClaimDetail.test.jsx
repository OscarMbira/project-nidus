import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ExpenseClaimDetail from '../ExpenseClaimDetail'
import { getExpenseClaim } from '../../../services/expenseClaimService'

vi.mock('../../../services/expenseClaimService', () => ({
  getExpenseClaim: vi.fn(),
  getExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuditUserLabels: vi.fn(async () => ({ 'u-1': 'Oscar Mbira' })),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const claim = {
  id: 'c-1',
  project_id: 'p-standalone',
  projects: { project_code: 'PM-STANDALONE-01', project_name: 'Personal Consulting Pilot' },
  amount: 120,
  currency: 'USD',
  claim_status: 'draft',
  expense_date: '2026-09-01',
  description: 'Printer ink',
  is_reimbursable: true,
  submitted_by_user_id: 'u-1',
  created_at: '2026-09-01T09:00:00Z',
  updated_at: '2026-09-02T10:00:00Z',
}

function renderAt(id) {
  return render(
    <MemoryRouter initialEntries={['/platform/expenses/my', `/platform/expenses/my/${id}`]} initialIndex={1}>
      <Routes>
        <Route path="/platform/expenses/my" element={<p>Claims list</p>} />
        <Route path="/platform/expenses/my/:id" element={<ExpenseClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExpenseClaimDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getExpenseClaim.mockResolvedValue(claim)
  })

  it('goes back to the previous page when Back is clicked', async () => {
    renderAt('c-1')
    await screen.findByText('Printer ink')

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByText('Claims list')).toBeInTheDocument()
  })

  it('shows the claim details by default', async () => {
    renderAt('c-1')

    expect(await screen.findByText('PM-STANDALONE-01')).toBeInTheDocument()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
    expect(screen.getByText(/120/)).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
  })

  it('shows record history on the Audit details tab', async () => {
    renderAt('c-1')
    await screen.findByText('Printer ink')

    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))

    expect(await screen.findByText('Record history')).toBeInTheDocument()
    expect(screen.getByText('Oscar Mbira')).toBeInTheDocument()
  })
})
