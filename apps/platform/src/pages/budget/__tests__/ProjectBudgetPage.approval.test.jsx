import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId, setApprovalStatus } from '../../../services/projectBudgetCategoryService'

const perms = vi.hoisted(() => ({ value: {} }))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => perms.value,
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(),
  saveForProject: vi.fn(),
  getRevisions: vi.fn(async () => ({ success: true, data: [] })),
  setApprovalStatus: vi.fn(async () => ({ success: true })),
}))

vi.mock('../../../services/budgetCategoryService', () => ({
  getBudgetCategories: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('../../../services/fundingSourceService', () => ({
  getFundingSources: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('@nidus/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve({
      data: { project_name: 'Velocity Freight', project_code: 'SEED334-PRJ-08', budget_currency: 'USD', budget_approval_status: null },
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

describe('ProjectBudgetPage — setting the budget approval status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getByProjectId.mockResolvedValue({ success: true, data: [{ category_name: 'Labour', budget_amount: 420000 }] })
  })

  it('lets a project manager submit the budget for approval', async () => {
    perms.value = { canManage: true, canManageAll: false, readOnlyExecutive: false }
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /submit for approval/i }))

    await waitFor(() => expect(setApprovalStatus).toHaveBeenCalledWith('proj-1', 'pending', null))
    expect(screen.queryByRole('button', { name: /^approve$/i })).toBeNull()
  })

  it('shows approve and reject to PMO administrators', async () => {
    perms.value = { canManage: true, canManageAll: true, readOnlyExecutive: false }
    renderPage()

    expect(await screen.findByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('shows no status controls to read-only executives', async () => {
    perms.value = { canManage: false, canManageAll: false, readOnlyExecutive: true }
    renderPage()

    await screen.findByText('Labour')
    expect(screen.queryByRole('button', { name: /submit for approval/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull()
  })
})
