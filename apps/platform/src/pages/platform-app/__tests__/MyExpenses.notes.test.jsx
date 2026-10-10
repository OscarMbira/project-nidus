import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses, saveDraft, getExpenseClaimItems } from '../../../services/expenseClaimService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-seed',
  projects: [{ projectId: 'p-seed', projectCode: 'SEED334-PRJ-08', projectName: 'Velocity Freight' }],
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
  getExpenseCategories: vi.fn(async () => ({ success: true, data: [] })),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <MyExpenses />
    </MemoryRouter>,
  )
}

describe('MyExpenses — Notes field (v1234)', () => {
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
      expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Receipt pending from vendor' })),
    )
  })

  it('restores notes when editing a draft', async () => {
    getMyExpenses.mockResolvedValue([
      { id: 'c-1', project_id: 'p-seed', claim_status: 'draft', amount: 45, description: 'Groceries', notes: 'Existing note', expense_date: '2026-09-01' },
    ])
    getExpenseClaimItems.mockResolvedValue([])

    renderPage()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }))

    expect(await screen.findByLabelText('Notes')).toHaveValue('Existing note')
  })
})
