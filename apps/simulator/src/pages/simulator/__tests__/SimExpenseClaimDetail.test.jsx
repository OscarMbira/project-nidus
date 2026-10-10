import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SimExpenseClaimDetail from '../SimExpenseClaimDetail'
import { getSimExpenseClaim, getSimExpenseClaimItems } from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getSimExpenseClaim: vi.fn(),
  getSimExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuditUserLabels: vi.fn(async () => ({ 'u-1': 'Oscar Mbira' })),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const claim = {
  id: 'c-1',
  practice_project_id: 'pp-1',
  practice_projects: { project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' },
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
    <MemoryRouter initialEntries={['/simulator/expenses/my', `/simulator/expenses/my/${id}`]} initialIndex={1}>
      <Routes>
        <Route path="/simulator/expenses/my" element={<p>Claims list</p>} />
        <Route path="/simulator/expenses/my/:id" element={<SimExpenseClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SimExpenseClaimDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSimExpenseClaim.mockResolvedValue(claim)
  })

  it('goes back to the previous page when Back is clicked', async () => {
    renderAt('c-1')
    await screen.findByText('Printer ink')
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByText('Claims list')).toBeInTheDocument()
  })

  it('shows the claim details by default', async () => {
    renderAt('c-1')
    expect(await screen.findByText('SIM-PRO-2026-001')).toBeInTheDocument()
    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  it('shows record history on the Audit details tab', async () => {
    renderAt('c-1')
    await screen.findByText('Printer ink')
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(await screen.findByText('Record history')).toBeInTheDocument()
    expect(screen.getByText('Oscar Mbira')).toBeInTheDocument()
  })

  it('shows the itemized breakdown when the claim has items', async () => {
    getSimExpenseClaimItems.mockResolvedValue([{ id: 'i1', description: 'Milk', amount: 20, category_id: null }])
    renderAt('c-1')
    expect(await screen.findByText('Milk')).toBeInTheDocument()
  })
})
