import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId, saveForProject } from '../../../services/projectBudgetCategoryService'
import { getBudgetCategories } from '../../../services/budgetCategoryService'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: true, readOnlyExecutive: false }),
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
  getBudgetCategories: vi.fn(),
}))

vi.mock('../../../services/fundingSourceService', () => ({
  getFundingSources: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('@nidus/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve({
      data: { project_name: 'Velocity Freight', project_code: 'SEED334-PRJ-08', budget_currency: 'USD' },
      error: null,
    }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
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

async function pickCategory(search, name) {
  fireEvent.click(await screen.findByText('Select category…'))
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: search } })
  fireEvent.click(await screen.findByRole('option', { name }))
}

describe('ProjectBudgetPage — Add line', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getByProjectId.mockResolvedValue({ success: true, data: [] })
    getBudgetCategories.mockResolvedValue({
      success: true,
      data: [{ id: 'bc-1', name: 'Travel' }, { id: 'bc-2', name: 'Equipment' }],
    })
    saveForProject.mockResolvedValue({ success: true })
  })

  it('tells the user what is missing instead of doing nothing when the line is incomplete', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /add line/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/category and an amount greater than 0/i)))
    expect(saveForProject).not.toHaveBeenCalled()
  })

  it('offers budget categories from the database as a searchable dropdown', async () => {
    renderPage()
    await pickCategory('Equi', 'Equipment')

    expect(getBudgetCategories).toHaveBeenCalled()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })

  it('edits an existing line in place from its row action', async () => {
    getByProjectId.mockResolvedValue({
      success: true,
      data: [
        { id: 'l-1', category_name: 'Labour', budget_amount: 420000 },
        { id: 'l-2', category_name: 'Routing software', budget_amount: 180000 },
      ],
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Labour' }))
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '450k' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /save line/i }))

    await waitFor(() => expect(saveForProject).toHaveBeenCalled())
    const savedLines = saveForProject.mock.calls[0][1]
    expect(savedLines).toHaveLength(2)
    expect(savedLines).toContainEqual(expect.objectContaining({ category_name: 'Labour', budget_amount: 450000 }))
    expect(savedLines).toContainEqual(expect.objectContaining({ category_name: 'Routing software', budget_amount: 180000 }))
  })

  it('accepts shorthand amounts such as 5k and saves them as numbers', async () => {
    renderPage()
    await pickCategory('Travel', 'Travel')
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '5k' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /add line/i }))

    await waitFor(() => expect(saveForProject).toHaveBeenCalled())
    const savedLines = saveForProject.mock.calls[0][1]
    expect(savedLines).toContainEqual(expect.objectContaining({ category_name: 'Travel', budget_amount: 5000 }))
  })
})
