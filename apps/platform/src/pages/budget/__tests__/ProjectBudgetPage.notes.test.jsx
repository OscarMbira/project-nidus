import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId, saveForProject } from '../../../services/projectBudgetCategoryService'
import { getBudgetCategories } from '../../../services/budgetCategoryService'

const db = vi.hoisted(() => ({ updates: [] }))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: true, canManageAll: false, readOnlyExecutive: false }),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(),
  saveForProject: vi.fn(),
  getRevisions: vi.fn(async () => ({ success: true, data: [] })),
  setApprovalStatus: vi.fn(),
}))

vi.mock('../../../services/budgetCategoryService', () => ({
  getBudgetCategories: vi.fn(async () => ({ success: true, data: [{ id: 'bc-1', name: 'Travel' }] })),
}))

vi.mock('../../../services/fundingSourceService', () => ({
  getFundingSources: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('@nidus/supabase', () => {
  const project = {
    project_name: 'Velocity Freight',
    project_code: 'SEED334-PRJ-08',
    budget_currency: 'USD',
    budget_approval_status: null,
    budget_notes: 'Board wants a contingency review in Q3.',
  }
  const chain = {
    select: () => chain,
    eq: () => chain,
    update: (values) => {
      db.updates.push(values)
      return chain
    },
    single: () => Promise.resolve({ data: project, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve) => resolve({ data: null, error: null }),
  }
  return {
    platformDb: {
      from: () => chain,
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectBudgetPage />
    </MemoryRouter>,
  )
}

describe('ProjectBudgetPage — notes per line and an overall Notes tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.updates.length = 0
    getByProjectId.mockResolvedValue({ success: true, data: [] })
    saveForProject.mockResolvedValue({ success: true })
    getBudgetCategories.mockResolvedValue({ success: true, data: [{ id: 'bc-1', name: 'Travel' }] })
  })

  it('saves a note with a budget line', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Select category…'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Travel' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Travel' }))
    fireEvent.change(screen.getByPlaceholderText(/amount/i), { target: { value: '5000' } })
    fireEvent.change(screen.getByPlaceholderText('Notes (optional)'), { target: { value: 'Quoted by two agencies' } })
    fireEvent.click(screen.getByRole('button', { name: /add line/i }))

    await waitFor(() => expect(saveForProject).toHaveBeenCalled())
    const savedLines = saveForProject.mock.calls[0][1]
    expect(savedLines).toContainEqual(expect.objectContaining({ category_name: 'Travel', notes: 'Quoted by two agencies' }))
  })

  it('places an overall Notes tab before Revision History', async () => {
    renderPage()
    const tabs = (await screen.findAllByRole('tab')).map((t) => t.textContent)
    expect(tabs.indexOf('Notes')).toBeGreaterThan(-1)
    expect(tabs.indexOf('Notes')).toBeLessThan(tabs.indexOf('Revision History'))
  })

  it('shows and saves the overall budget notes', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: 'Notes' }))

    const box = await screen.findByDisplayValue('Board wants a contingency review in Q3.')
    fireEvent.change(box, { target: { value: 'Contingency reviewed with sponsor.' } })
    fireEvent.click(screen.getByRole('button', { name: /save notes/i }))

    await waitFor(() => expect(db.updates).toContainEqual({ budget_notes: 'Contingency reviewed with sponsor.' }))
  })
})
