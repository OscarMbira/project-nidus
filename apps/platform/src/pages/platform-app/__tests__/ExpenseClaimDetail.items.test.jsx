import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ExpenseClaimDetail from '../ExpenseClaimDetail'
import { getExpenseClaim, getExpenseClaimItems } from '../../../services/expenseClaimService'

vi.mock('../../../services/expenseClaimService', () => ({
  getExpenseClaim: vi.fn(),
  getExpenseClaimItems: vi.fn(),
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuditUserLabels: vi.fn(async () => ({})),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const itemizedClaim = {
  id: 'c-2',
  project_id: 'p-standalone',
  projects: { project_code: 'PM-STANDALONE-01', project_name: 'Personal Consulting Pilot' },
  amount: 45,
  currency: 'USD',
  claim_status: 'draft',
  expense_date: '2026-09-01',
  description: 'Groceries',
  is_reimbursable: true,
  submitted_by_user_id: 'u-1',
}

const simpleClaim = { ...itemizedClaim, id: 'c-3', description: 'Printer ink', amount: 120 }

function renderAt(id) {
  return render(
    <MemoryRouter initialEntries={[`/platform/expenses/my/${id}`]}>
      <Routes>
        <Route path="/platform/expenses/my/:id" element={<ExpenseClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExpenseClaimDetail — itemized breakdown (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the itemized breakdown read-only when the claim has items', async () => {
    getExpenseClaim.mockResolvedValue(itemizedClaim)
    getExpenseClaimItems.mockResolvedValue([
      { id: 'i1', description: 'Milk', amount: 20, category_id: null },
      { id: 'i2', description: 'Eggs', amount: 25, category_id: null },
    ])

    renderAt('c-2')

    expect(await screen.findByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Eggs')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add item/i })).toBeNull()
  })

  it('renders nothing extra when the claim has no items', async () => {
    getExpenseClaim.mockResolvedValue(simpleClaim)
    getExpenseClaimItems.mockResolvedValue([])

    renderAt('c-3')

    expect(await screen.findByText('Printer ink')).toBeInTheDocument()
    expect(screen.queryByText(/no items added/i)).toBeNull()
  })
})
