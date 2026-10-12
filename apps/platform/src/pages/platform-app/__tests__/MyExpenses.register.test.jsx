import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'
import { getMyExpenses, deleteDraft } from '../../../services/expenseClaimService'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-standalone',
  projects: [
    { projectId: 'p-seed', projectCode: 'SEED334-PRJ-08', projectName: 'Velocity Freight' },
    { projectId: 'p-standalone', projectCode: 'PM-STANDALONE-01', projectName: 'Personal Consulting Pilot' },
  ],
}))

vi.mock('../../../lib/CurrentProjectContext', () => ({
  useCurrentProject: () => ({ currentProjectId: ctx.currentProjectId, projects: ctx.projects, loading: false }),
}))

vi.mock('../../../services/expenseClaimService', () => ({
  getMyExpenses: vi.fn(),
  saveDraft: vi.fn(),
  submitExpense: vi.fn(),
  deleteDraft: vi.fn(async () => ({ success: true })),
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
    project_id: 'p-standalone',
    projects: { project_code: 'PM-STANDALONE-01', project_name: 'Personal Consulting Pilot' },
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

describe('MyExpenses — list of claims', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMyExpenses.mockResolvedValue(claims)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('puts New claim and My claims in separate tabs, with My claims shown first', async () => {
    renderPage()

    expect(await screen.findByRole('tab', { name: 'My claims' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'New claim' })).toHaveAttribute('aria-selected', 'false')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByLabelText('Amount')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'New claim' }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
  })

  it('switches to the New claim tab when editing a draft', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: /edit printer ink/i }))

    expect(screen.getByRole('tab', { name: 'New claim' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Amount')).toHaveValue('120')
  })

  it('lists claims in a table with row numbers, sorted alphabetically by project', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('1')).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent('PM-STANDALONE-01')
    expect(rows[1]).toHaveTextContent('SEED334-PRJ-08')
  })

  it('filters claims by project or description', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.change(screen.getByPlaceholderText('Search claims...'), { target: { value: 'printer' } })
    expect(screen.queryByText('Client site visit')).toBeNull()
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
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

    fireEvent.change(search, { target: { value: 'draft' } })
    expect(screen.getByText('Printer ink')).toBeInTheDocument()
    expect(screen.queryByText('Client site visit')).toBeNull()
  })

  it('shows Edit and Delete only for draft claims', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.getByRole('button', { name: /edit printer ink/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete printer ink/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit client site visit/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /delete client site visit/i })).toBeNull()
  })

  it('loads a draft into the form when Edit is clicked', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: /edit printer ink/i }))

    expect(screen.getByLabelText('Amount')).toHaveValue('120')
    expect(screen.getByLabelText('Description')).toHaveValue('Printer ink')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('deletes a draft after confirmation', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: /delete printer ink/i }))

    await waitFor(() => expect(deleteDraft).toHaveBeenCalledWith('c-2'))
  })

  it('switches between table and card views', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Client site visit')).toBeInTheDocument()
  })
})
