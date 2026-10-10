import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SimExpenseApprovalThresholds from '../SimExpenseApprovalThresholds'
import { listSimThresholds, saveSimThreshold } from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  listSimThresholds: vi.fn(async () => []),
  saveSimThreshold: vi.fn(async () => ({})),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(
              table === 'users' ? { data: { id: 'u-1' } } : { data: { id: 'acct-1' } },
            ),
        }),
      }),
    }),
  },
}))

describe('SimExpenseApprovalThresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and lists existing thresholds for the account', async () => {
    listSimThresholds.mockResolvedValue([{ id: 't1', threshold_name: 'Standard', min_amount: 0, max_amount: 500, required_approval_level: 1 }])
    render(<SimExpenseApprovalThresholds />)
    await waitFor(() => expect(listSimThresholds).toHaveBeenCalledWith('acct-1'))
    expect(await screen.findByText(/Standard/)).toBeInTheDocument()
  })

  it('saves a new threshold', async () => {
    render(<SimExpenseApprovalThresholds />)
    await waitFor(() => expect(listSimThresholds).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'High value' } })
    fireEvent.click(screen.getByRole('button', { name: /save threshold/i }))

    await waitFor(() =>
      expect(saveSimThreshold).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'acct-1', threshold_name: 'High value' })),
    )
  })
})
