import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectBudgetPage from '../ProjectBudgetPage'
import { getByProjectId } from '../../../services/projectBudgetCategoryService'

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
  getRevisions: vi.fn(async () => ({ success: true, data: [] })),
  setApprovalStatus: vi.fn(),
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

const lines = [
  { id: 'l-1', category_name: 'Labour', budget_amount: 420000 },
  { id: 'l-2', category_name: 'Routing software', budget_amount: 180000 },
  { id: 'l-3', category_name: 'Fleet telematics', budget_amount: 150000 },
  { id: 'l-4', category_name: 'Contingency', budget_amount: 90000 },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectBudgetPage />
    </MemoryRouter>,
  )
}

describe('ProjectBudgetPage — total shown below the budget lines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('repeats the total in a footer row under the table', async () => {
    getByProjectId.mockResolvedValue({ success: true, data: lines })
    const { container } = renderPage()

    await screen.findByText('Labour')
    await waitFor(() => {
      const tfoot = container.querySelector('tfoot')
      expect(tfoot).not.toBeNull()
      expect(tfoot).toHaveTextContent('Total')
      expect(tfoot).toHaveTextContent('840,000')
    })
  })

  it('keeps the total at the top of the page', async () => {
    getByProjectId.mockResolvedValue({ success: true, data: lines })
    renderPage()

    expect(await screen.findByText(/total budget: usd 840,000/i)).toBeInTheDocument()
  })

  it('shows no footer when there are no budget lines', async () => {
    getByProjectId.mockResolvedValue({ success: true, data: [] })
    const { container } = renderPage()

    expect(await screen.findByText(/no budget lines yet/i)).toBeInTheDocument()
    expect(container.querySelector('tfoot')).toBeNull()
  })
})
