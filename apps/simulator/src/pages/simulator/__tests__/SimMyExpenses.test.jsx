import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SimMyExpenses from '../SimMyExpenses'
import { getMySimExpenses, saveSimDraft, deleteSimDraft, getSimExpenseClaimItems } from '../../../services/simExpenseClaimService'
import { getSimExpenseCategories } from '../../../services/simExpenseCategoryService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getMySimExpenses: vi.fn(async () => []),
  saveSimDraft: vi.fn(async () => ({ id: 'c-new' })),
  submitSimExpense: vi.fn(),
  deleteSimDraft: vi.fn(async () => ({ success: true })),
  getSimExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('../../../services/simExpenseCategoryService', () => ({
  getSimExpenseCategories: vi.fn(async () => ({ success: true, data: [{ id: 'cat-1', category_name: 'Travel' }] })),
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

const claims = [
  {
    id: 'c-1',
    practice_project_id: 'pp-1',
    practice_projects: { project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' },
    amount: 120,
    currency: 'USD',
    claim_status: 'draft',
    expense_date: '2026-09-01',
    description: 'Printer ink',
  },
  {
    id: 'c-2',
    practice_project_id: 'pp-2',
    practice_projects: { project_code: 'SIM-PRO-2026-002', project_name: 'Practice Pilot' },
    amount: 470.25,
    currency: 'USD',
    claim_status: 'submitted',
    expense_date: '2026-08-17',
    description: 'Client site visit',
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <SimMyExpenses />
    </MemoryRouter>,
  )
}

describe('SimMyExpenses — My claims / New claim (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMySimExpenses.mockResolvedValue(claims)
    getSimExpenseCategories.mockResolvedValue({ success: true, data: [{ id: 'cat-1', category_name: 'Travel' }] })
    getSimExpenseClaimItems.mockResolvedValue([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('defaults to My claims and lists claims in a table with row numbers', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('SIM-PRO-2026-001')
    expect(within(rows[0]).getByText('1')).toBeInTheDocument()
  })

  it('labels every field of the New claim form', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    expect(await screen.findByLabelText('Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Expense date')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('toggling itemize hides the typed Amount input and shows the items table', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    fireEvent.click(screen.getByRole('checkbox', { name: /itemize this expense/i }))
    expect(screen.queryByLabelText('Amount')).toBeNull()
    expect(screen.getByLabelText(/new item description/i)).toBeInTheDocument()
  })

  it('saves an itemized claim with the computed total', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /itemize this expense/i }))

    fireEvent.change(screen.getByLabelText(/new item description/i), { target: { value: 'Milk' } })
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '20' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() =>
      expect(saveSimDraft).toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ description: 'Milk', amount: 20 })] }),
      ),
    )
  })

  it('filters claims by date, amount, or status (v1232)', async () => {
    renderPage()
    await screen.findByRole('table')
    const search = screen.getByPlaceholderText('Search claims...')

    fireEvent.change(search, { target: { value: '2026-09-01' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: '470.25' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.queryByText('Printer ink')).toBeNull()

    fireEvent.change(search, { target: { value: 'submitted' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.queryByText('Printer ink')).toBeNull()
  })

  it('shows Edit and Delete only for draft claims, and deletes after confirmation', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('button', { name: /edit printer ink/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete printer ink/i }))
    await waitFor(() => expect(deleteSimDraft).toHaveBeenCalledWith('c-1'))
  })
})
