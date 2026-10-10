import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyExpenses from '../MyExpenses'

const ctx = vi.hoisted(() => ({
  currentProjectId: 'p-standalone',
  projects: [],
}))

vi.mock('../../../context/CurrentProjectContext', () => ({
  useCurrentProject: () => ({ currentProjectId: ctx.currentProjectId, projects: ctx.projects, loading: false }),
}))

vi.mock('../../../services/expenseClaimService', () => ({
  getMyExpenses: vi.fn(async () => []),
  saveDraft: vi.fn(),
  submitExpense: vi.fn(),
}))

vi.mock('@nidus/supabase', () => {
  const rows = {
    users: { id: 'u-1' },
    user_projects: [{ project_id: 'p-seed' }, { project_id: 'p-standalone' }],
    projects: [
      { id: 'p-seed', project_code: 'SEED334-PRJ-25', project_name: 'Zephyr Hospitality' },
      { id: 'p-standalone', project_code: 'PM-STANDALONE-01', project_name: 'Personal Consulting Pilot' },
    ],
  }
  const chain = (table) => {
    const c = {
      select: () => c,
      eq: () => c,
      in: () => c,
      limit: () => c,
      maybeSingle: () => Promise.resolve({ data: rows.users, error: null }),
      then: (resolve) => resolve({ data: rows[table], error: null }),
    }
    return c
  }
  return {
    platformDb: {
      from: (table) => chain(table),
      auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
    },
  }
})

describe('MyExpenses — labelled fields and the header project as the default', () => {
  beforeEach(() => {
    ctx.currentProjectId = 'p-standalone'
  })

  it('labels every field of the New claim form', async () => {
    render(
      <MemoryRouter>
        <MyExpenses />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    expect(await screen.findByLabelText('Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Expense date')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('lists only the projects the user is currently assigned to', async () => {
    ctx.projects = [
      { projectId: 'p-standalone', projectCode: 'PM-STANDALONE-01', projectName: 'Personal Consulting Pilot' },
    ]
    render(
      <MemoryRouter>
        <MyExpenses />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    const project = await screen.findByLabelText('Project')
    expect(project.querySelectorAll('option')).toHaveLength(1)
    expect(screen.queryByRole('option', { name: /SEED334-PRJ-25/ })).toBeNull()
  })

  it('defaults the claim to the project selected in the header', async () => {
    render(
      <MemoryRouter>
        <MyExpenses />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'New claim' }))

    const project = await screen.findByLabelText('Project')
    await waitFor(() => expect(project).toHaveValue('p-standalone'))
  })
})
