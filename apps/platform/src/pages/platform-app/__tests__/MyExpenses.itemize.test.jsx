import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses, saveDraft, getExpenseClaimItems } from '../../../services/expenseClaimService'
import { getExpenseCategories } from '../../../services/expenseCategoryService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-standalone',
  projects: [{ projectId: 'p-standalone', projectCode: 'PM-STANDALONE-01', projectName: 'Personal Consulting Pilot' }],
}))

vi.mock('../../../context/CurrentProjectContext', () => ({
  useCurrentProject: () => ({ currentProjectId: ctx.currentProjectId, projects: ctx.projects, loading: false }),
}))

vi.mock('../../../services/expenseClaimService', () => ({
  getMyExpenses: vi.fn(async () => []),
  saveDraft: vi.fn(async () => ({ id: 'c-new' })),
  submitExpense: vi.fn(),
  deleteDraft: vi.fn(),
  getExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('../../../services/expenseCategoryService', () => ({
  getExpenseCategories: vi.fn(async () => ({ success: true, data: [{ id: 'cat-1', category_name: 'Travel' }] })),
}))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <MyExpenses />
    </MemoryRouter>,
  )
}

describe('MyExpenses — itemize this expense (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMyExpenses.mockResolvedValue([])
    saveDraft.mockResolvedValue({ id: 'c-new' })
    getExpenseCategories.mockResolvedValue({ success: true, data: [{ id: 'cat-1', category_name: 'Travel' }] })
    getExpenseClaimItems.mockResolvedValue([])
  })

  it('toggling itemize hides the typed Amount input and shows the items table', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /itemize this expense/i }))

    expect(screen.queryByLabelText('Amount')).toBeNull()
    expect(screen.getByLabelText(/new item description/i)).toBeInTheDocument()
  })

  it('blocks saving an itemized claim with zero items', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /itemize this expense/i }))

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() => expect(saveDraft).not.toHaveBeenCalled())
  })

  it('saves the itemized claim with its items and the computed total', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /itemize this expense/i }))

    fireEvent.change(screen.getByLabelText(/new item description/i), { target: { value: 'Milk' } })
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '20' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))

    expect(screen.getAllByText(/20/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }))

    await waitFor(() =>
      expect(saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ description: 'Milk', amount: 20 })] }),
      ),
    )
  })

  it('restores items and turns the toggle on when editing a draft that has items', async () => {
    getMyExpenses.mockResolvedValue([
      { id: 'c-1', project_id: 'p-standalone', claim_status: 'draft', amount: 45, description: 'Groceries', expense_date: '2026-09-01' },
    ])
    getExpenseClaimItems.mockResolvedValue([{ id: 'i1', description: 'Milk', amount: 20, category_id: null }])

    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }))

    await waitFor(() => expect(getExpenseClaimItems).toHaveBeenCalledWith('c-1'))
    expect(await screen.findByRole('checkbox', { name: /itemize this expense/i })).toBeChecked()
    expect(screen.getByText('Milk')).toBeInTheDocument()
  })
})
