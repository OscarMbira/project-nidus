import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CurrentProjectProvider } from '../../../context/CurrentProjectContext'
import PMProjectSelector from '../../../components/pm/PMProjectSelector'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId } from '../../../services/projectBudgetCategoryService'

vi.mock('@nidus/shared/utils/authSession', () => ({
  getAuthenticatedUser: vi.fn(async () => ({ user: { id: 'auth-1' }, error: null })),
}))

vi.mock('../../../services/roleService', () => ({
  getUserProjectRoles: vi.fn(async () => ({
    success: true,
    data: [
      {
        project_id: 'p-seed',
        projects: { project_name: 'Velocity Freight', project_code: 'SEED334-PRJ-08' },
        project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
      },
      {
        project_id: 'p-standalone',
        projects: { project_name: 'Personal Consulting Pilot', project_code: 'PM-STANDALONE-01' },
        project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
      },
    ],
  })),
}))

vi.mock('@nidus/shared/utils/projectRouteParam', async (importOriginal) => {
  const actual = await importOriginal()
  const ids = { 'SEED334-PRJ-08': 'p-seed', 'PM-STANDALONE-01': 'p-standalone' }
  return {
    ...actual,
    resolveProjectIdFromRouteSegment: vi.fn(async (seg) => ids[seg] || seg),
    resolveProjectRouteKeyFromId: vi.fn(async (id) => ({ 'p-seed': 'SEED334-PRJ-08', 'p-standalone': 'PM-STANDALONE-01' })[id] || id),
  }
})

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: true, canManageAll: false, readOnlyExecutive: false }),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(async () => ({ success: true, data: [] })),
  saveForProject: vi.fn(),
  getRevisions: vi.fn(async () => ({ success: true, data: [] })),
  setApprovalStatus: vi.fn(),
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
      data: { project_name: 'Project', project_code: 'X', budget_currency: 'USD', budget_approval_status: null },
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

describe('ProjectBudgetPage — loads the newly selected project', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('reloads the budget for the new project after switching', async () => {
    render(
      <MemoryRouter initialEntries={['/platform/budget?projectId=SEED334-PRJ-08']}>
        <CurrentProjectProvider>
          <PMProjectSelector compact />
          <Routes>
            <Route path="*" element={<ProjectBudgetPage />} />
          </Routes>
        </CurrentProjectProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(getByProjectId).toHaveBeenCalledWith('p-seed'))

    fireEvent.focus(await screen.findByLabelText('Project'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))

    await waitFor(() => expect(getByProjectId).toHaveBeenLastCalledWith('p-standalone'))
  })
})
