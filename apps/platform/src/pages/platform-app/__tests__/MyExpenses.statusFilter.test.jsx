import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses } from '../../../services/expenseClaimService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-seed',
  projects: [{ projectId: 'p-seed', projectCode: 'SEED334-PRJ-08', projectName: 'Velocity Freight' }],
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

const claims = [
  {
    id: 'c-1',
    project_id: 'p-seed',
    projects: { project_code: 'SEED334-PRJ-08', project_name: 'Velocity Freight' },
    amount: 470.25,
    currency: 'USD',
    claim_status: 'submitted',
    expense_date: '2026-08-17',
    description: 'Client site visit',
  },
  {
    id: 'c-2',
    project_id: 'p-seed',
    projects: { project_code: 'SEED334-PRJ-08', project_name: 'Velocity Freight' },
    amount: 120,
    currency: 'USD',
    claim_status: 'draft',
    expense_date: '2026-09-01',
    description: 'Printer ink',
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <MyExpenses />
    </MemoryRouter>,
  )
}

describe('MyExpenses — Status filter dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMyExpenses.mockResolvedValue(claims)
  })

  it('filters claims by status', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
  })

  it('shows all claims when status is set back to All', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
  })
})
