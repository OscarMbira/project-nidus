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

let capturedProps = null
vi.mock('@nidus/ui/ExportRecordMenu', () => ({
  default: (props) => {
    capturedProps = props
    return <div data-testid="export-record-menu" />
  },
}))

const claim = {
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

function renderAt(id) {
  return render(
    <MemoryRouter initialEntries={[`/platform/expenses/my/${id}`]}>
      <Routes>
        <Route path="/platform/expenses/my/:id" element={<ExpenseClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExpenseClaimDetail — export with itemized lines (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedProps = null
  })

  it('includes each line item as its own export row', async () => {
    getExpenseClaim.mockResolvedValue(claim)
    getExpenseClaimItems.mockResolvedValue([
      { id: 'i1', description: 'Milk', amount: 20, category_id: null },
      { id: 'i2', description: 'Eggs', amount: 25, category_id: null },
    ])

    renderAt('c-2')
    await screen.findByTestId('export-record-menu')

    expect(capturedProps.record.items).toEqual([
      expect.stringContaining('Milk'),
      expect.stringContaining('Eggs'),
    ])
  })
})
