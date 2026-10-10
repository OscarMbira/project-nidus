import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExpenseApproval from '../ExpenseApproval'
import { getPendingApprovals, getFullyApprovedClaims, getExpenseClaimItems } from '../../../services/expenseClaimService'

vi.mock('../../../services/expenseClaimService', () => ({
  getPendingApprovals: vi.fn(),
  getFullyApprovedClaims: vi.fn(async () => []),
  approveStep: vi.fn(),
  rejectStep: vi.fn(),
  markPaid: vi.fn(),
  getApprovalHistory: vi.fn(async () => []),
  getExpenseClaimItems: vi.fn(),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManageAll: false }),
}))

const pendingClaim = {
  id: 'c-1',
  projects: { project_code: 'PM-STANDALONE-01' },
  amount: 45,
  currency: 'USD',
  claim_status: 'pending_l1',
}

describe('ExpenseApproval — itemized breakdown (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPendingApprovals.mockResolvedValue([pendingClaim])
    getExpenseClaimItems.mockResolvedValue([{ id: 'i1', description: 'Milk', amount: 20, category_id: null }])
  })

  it('shows the itemized breakdown when the Items toggle is clicked', async () => {
    render(<ExpenseApproval />)
    await screen.findByText(/PM-STANDALONE-01/)

    fireEvent.click(screen.getByRole('button', { name: /items/i }))

    await waitFor(() => expect(getExpenseClaimItems).toHaveBeenCalledWith('c-1'))
    expect(await screen.findByText('Milk')).toBeInTheDocument()
  })
})
