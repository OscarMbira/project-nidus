import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SimMyExpenses from '../SimMyExpenses'
import { getMySimExpenses, saveSimDraft, getSimExpenseClaimItems } from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getMySimExpenses: vi.fn(async () => []),
  saveSimDraft: vi.fn(async () => ({ id: 'c-new' })),
  submitSimExpense: vi.fn(),
  deleteSimDraft: vi.fn(),
  getSimExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('../../../services/simExpenseCategoryService', () => ({
  getSimExpenseCategories: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('@nidus/supabase', () => ({
  simDb: {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: 'pp-1', project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' }] }),
        }),
      }),
    }),
  },
}))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SimMyExpenses />
    </MemoryRouter>,
  )
}

describe('SimMyExpenses — Notes field (v1234)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves captured notes alongside the other fields', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Receipt pending from vendor' } })
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() =>
      expect(saveSimDraft).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Receipt pending from vendor' })),
    )
  })

  it('restores notes when editing a draft', async () => {
    getMySimExpenses.mockResolvedValue([
      { id: 'c-1', practice_project_id: 'pp-1', claim_status: 'draft', amount: 45, description: 'Groceries', notes: 'Existing note', expense_date: '2026-09-01' },
    ])
    getSimExpenseClaimItems.mockResolvedValue([])

    renderPage()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }))

    expect(await screen.findByLabelText('Notes')).toHaveValue('Existing note')
  })
})
