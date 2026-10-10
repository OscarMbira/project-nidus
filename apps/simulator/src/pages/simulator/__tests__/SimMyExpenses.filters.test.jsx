import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SimMyExpenses from '../SimMyExpenses'
import { getMySimExpenses } from '../../../services/simExpenseClaimService'

vi.mock('../../../services/simExpenseClaimService', () => ({
  getMySimExpenses: vi.fn(),
  saveSimDraft: vi.fn(),
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

const claims = [
  {
    id: 'c-1',
    practice_project_id: 'pp-1',
    practice_projects: { project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' },
    amount: 470.25,
    currency: 'USD',
    claim_status: 'submitted',
    expense_date: '2026-08-17',
    description: 'Client site visit',
  },
  {
    id: 'c-2',
    practice_project_id: 'pp-1',
    practice_projects: { project_code: 'SIM-PRO-2026-001', project_name: 'Practice Rollout' },
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
      <SimMyExpenses />
    </MemoryRouter>,
  )
}

describe('SimMyExpenses — date/amount range + status filters (v1232)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMySimExpenses.mockResolvedValue(claims)
  })

  it('filters by a date range', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-08-20' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
  })

  it('filters by an amount range', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('Min amount'), { target: { value: '200' } })
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
    expect(screen.queryByText('Printer ink')).toBeNull()
  })

  it('filters by status', async () => {
    renderPage()
    await screen.findByText('Client site visit')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
  })
})
