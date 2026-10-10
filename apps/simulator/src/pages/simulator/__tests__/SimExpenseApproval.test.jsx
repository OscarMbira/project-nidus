import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SimExpenseApproval from '../SimExpenseApproval'
import {
  getSimPendingApprovals,
  getSimFullyApprovedClaims,
  approveSimStep,
  rejectSimStep,
  markSimPaid,
  getSimApprovalHistory,
  getSimExpenseClaimItems,
} from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getSimPendingApprovals: vi.fn(),
  getSimFullyApprovedClaims: vi.fn(async () => []),
  approveSimStep: vi.fn(async () => ({})),
  rejectSimStep: vi.fn(async () => ({})),
  markSimPaid: vi.fn(async () => ({})),
  getSimApprovalHistory: vi.fn(async () => []),
  getSimExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManageAll: false }),
}))

const pendingClaim = {
  id: 'c-1',
  practice_projects: { project_code: 'SIM-PRO-2026-001' },
  amount: 120,
  currency: 'USD',
  claim_status: 'pending_l1',
}

describe('SimExpenseApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSimPendingApprovals.mockResolvedValue([pendingClaim])
  })

  it('shows claims pending the current user\'s action', async () => {
    render(<SimExpenseApproval />)
    expect(await screen.findByText(/SIM-PRO-2026-001/)).toBeInTheDocument()
  })

  it('approves a claim', async () => {
    render(<SimExpenseApproval />)
    await screen.findByText(/SIM-PRO-2026-001/)
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(approveSimStep).toHaveBeenCalledWith('c-1', 'OK'))
  })

  it('rejects a claim', async () => {
    render(<SimExpenseApproval />)
    await screen.findByText(/SIM-PRO-2026-001/)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    await waitFor(() => expect(rejectSimStep).toHaveBeenCalledWith('c-1', 'Rejected'))
  })

  it('shows the itemized breakdown when Items is clicked', async () => {
    getSimExpenseClaimItems.mockResolvedValue([{ id: 'i1', description: 'Milk', amount: 20, category_id: null }])
    render(<SimExpenseApproval />)
    await screen.findByText(/SIM-PRO-2026-001/)
    fireEvent.click(screen.getByRole('button', { name: /items/i }))
    expect(await screen.findByText('Milk')).toBeInTheDocument()
  })
})
