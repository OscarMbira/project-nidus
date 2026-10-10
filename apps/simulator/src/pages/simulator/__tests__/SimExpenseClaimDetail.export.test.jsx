import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SimExpenseClaimDetail from '../SimExpenseClaimDetail'
import { getSimExpenseClaim, getSimExpenseClaimItems } from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getSimExpenseClaim: vi.fn(),
  getSimExpenseClaimItems: vi.fn(),
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
  practice_project_id: 'pp-1',
  practice_projects: { project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' },
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
    <MemoryRouter initialEntries={[`/simulator/expenses/my/${id}`]}>
      <Routes>
        <Route path="/simulator/expenses/my/:id" element={<SimExpenseClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SimExpenseClaimDetail — export with itemized lines (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedProps = null
  })

  it('includes each line item as its own export row', async () => {
    getSimExpenseClaim.mockResolvedValue(claim)
    getSimExpenseClaimItems.mockResolvedValue([
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
