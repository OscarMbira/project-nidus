import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId, getRevisions } from '../../../services/projectBudgetCategoryService'
import { getFundingSources } from '../../../services/fundingSourceService'

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: false, readOnlyExecutive: false }),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(),
  saveForProject: vi.fn(),
  getRevisions: vi.fn(),
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

describe('ProjectBudgetPage — revision history shows what changed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getByProjectId.mockResolvedValue({
      success: true,
      data: [{ category_name: 'Labour', budget_amount: 420000 }],
    })
    getRevisions.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'rev-2',
          revision_number: 2,
          total_amount: 420000,
          currency: 'USD',
          created_at: '2026-10-07T10:00:00Z',
          budget_categories: [{ category_name: 'Labour', budget_amount: 420000 }],
        },
        {
          id: 'rev-1',
          revision_number: 1,
          total_amount: 400000,
          currency: 'USD',
          created_at: '2026-10-07T09:00:00Z',
          budget_categories: [{ category_name: 'Labour', budget_amount: 400000 }],
        },
      ],
    })
  })

  it('shows renames and funding source changes by name', async () => {
    getFundingSources.mockResolvedValue({ success: true, data: [{ id: 'fs1', name: 'Loan / Financing' }] })
    getByProjectId.mockResolvedValue({
      success: true,
      data: [{ category_name: 'Routing platform', budget_amount: 180000, funding_source_id: 'fs1', display_order: 0 }],
    })
    getRevisions.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'rev-1',
          revision_number: 1,
          total_amount: 180000,
          currency: 'USD',
          created_at: '2026-10-07T09:00:00Z',
          budget_categories: [{ category_name: 'Routing software', budget_amount: 180000, funding_source_id: null, display_order: 0 }],
        },
      ],
    })
    render(
      <MemoryRouter>
        <ProjectBudgetPage />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'Revision History' }))

    expect(await screen.findByText('Renamed Routing software → Routing platform')).toBeInTheDocument()
    expect(screen.getByText('Routing platform funding source: None → Loan / Financing')).toBeInTheDocument()
  })

  it('describes each change in plain language', async () => {
    render(
      <MemoryRouter>
        <ProjectBudgetPage />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'Revision History' }))

    expect(await screen.findByText('Labour: 400,000 → 420,000')).toBeInTheDocument()
    expect(screen.getByText('No line changes')).toBeInTheDocument()
    expect(screen.getAllByText('Not set')).toHaveLength(2)
  })
})
