import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses } from '../../../services/expenseClaimService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-1',
  projects: [{ projectId: 'p-1', projectCode: 'AAA-FIRST', projectName: 'Alpha' }],
}))

vi.mock('../../../context/CurrentProjectContext', () => ({
  useCurrentProject: () => ({ currentProjectId: ctx.currentProjectId, projects: ctx.projects, loading: false }),
}))

vi.mock('../../../services/expenseClaimService', () => ({
  getMyExpenses: vi.fn(),
  saveDraft: vi.fn(),
  submitExpense: vi.fn(),
  deleteDraft: vi.fn(),
  getExpenseClaimItems: vi.fn(async () => []),
}))

vi.mock('../../../services/expenseCategoryService', () => ({
  getExpenseCategories: vi.fn(async () => ({ success: true, data: [] })),
}))

// project order (A) disagrees with date order (Z) and amount order, so each header's sort is distinguishable
const claims = [
  { id: 'c-1', project_id: 'p-1', projects: { project_code: 'AAA-FIRST', project_name: 'Alpha' }, amount: 99, currency: 'USD', claim_status: 'submitted', expense_date: '2026-12-31', description: 'Late big one' },
  { id: 'c-2', project_id: 'p-1', projects: { project_code: 'ZZZ-LAST', project_name: 'Zulu' }, amount: 10, currency: 'USD', claim_status: 'draft', expense_date: '2026-01-01', description: 'Early small one' },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <MyExpenses />
    </MemoryRouter>,
  )
}

function firstRowLabel(table) {
  const rows = within(table).getAllByRole('row').slice(1)
  return within(rows[0]).getByText(/Late big one|Early small one/).textContent
}

describe('MyExpenses — clicking Date/Amount/Status headers sorts the table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    getMyExpenses.mockResolvedValue(claims)
  })

  it('sorts by Date when the Date header is clicked', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    // Default sort is by project asc: AAA-FIRST (Late big one) first
    expect(firstRowLabel(table)).toBe('Late big one')

    fireEvent.click(screen.getByRole('button', { name: /date/i }))
    // Ascending by expense_date: 2026-01-01 (Early small one) first
    expect(firstRowLabel(table)).toBe('Early small one')
  })

  it('sorts by Amount when the Amount header is clicked', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    expect(firstRowLabel(table)).toBe('Late big one')

    fireEvent.click(screen.getByRole('button', { name: /amount/i }))
    // Ascending by amount: 10 (Early small one) first
    expect(firstRowLabel(table)).toBe('Early small one')
  })

  it('sorts by Status when the Status header is clicked', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    expect(firstRowLabel(table)).toBe('Late big one')

    fireEvent.click(screen.getByRole('button', { name: /status/i }))
    // Ascending alphabetically: 'draft' < 'submitted', so Early small one (draft) first
    expect(firstRowLabel(table)).toBe('Early small one')
  })
})
