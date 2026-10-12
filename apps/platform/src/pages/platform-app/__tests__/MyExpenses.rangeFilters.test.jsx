import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses } from '../../../services/expenseClaimService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-seed',
  projects: [{ projectId: 'p-seed', projectCode: 'SEED334-PRJ-08', projectName: 'Velocity Freight' }],
}))

vi.mock('../../../lib/CurrentProjectContext', () => ({
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

describe('MyExpenses — date and amount range filters (v1232)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMyExpenses.mockResolvedValue(claims)
  })

  it('filters by a date range', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-08-20' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-08-20' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.queryByText('Printer ink')).toBeNull()
  })

  it('filters by an amount range', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '200' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.queryByText('Printer ink')).toBeNull()

    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Max amount'), { target: { value: '200' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
  })

  it('combines range filters with the text search', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByPlaceholderText('Search claims...'), { target: { value: 'printer' } })
    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '200' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.queryByText('Printer ink')).toBeNull()
  })
})
