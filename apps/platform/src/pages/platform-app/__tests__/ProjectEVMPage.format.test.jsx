import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectEVMPage from '../ProjectEVMPage'
import { listEvmSnapshots } from '../../../services/evmService'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'p-1', routeKey: 'SEED334-PRJ-06' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: true, readOnlyExecutive: false }),
}))

vi.mock('../../../services/evmService', () => ({
  listEvmSnapshots: vi.fn(),
  upsertEvmSnapshot: vi.fn(),
  computeEvmMetrics: (snapshot, bac) => {
    const pv = Number(snapshot.planned_value) || 0
    const ev = Number(snapshot.earned_value) || 0
    const ac = Number(snapshot.actual_cost) || 0
    const bacN = Number(bac) || 0
    const spi = pv !== 0 ? ev / pv : null
    const cpi = ac !== 0 ? ev / ac : null
    const eac = cpi ? bacN / cpi : null
    const vac = eac != null ? bacN - eac : null
    return { spi, cpi, eac, vac }
  },
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { project_name: 'Nexus Platform', project_code: 'SEED334-PRJ-06' } }),
          maybeSingle: () => Promise.resolve({ data: { id: 'u-1' } }),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectEVMPage />
    </MemoryRouter>,
  )
}

describe('ProjectEVMPage — thousand-separated figures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEvmSnapshots.mockResolvedValue([
      { id: 's-1', period_date: '2024-11-01', planned_value: 12200, earned_value: 11590, actual_cost: 12220 },
    ])
  })

  it('shows EAC/VAC and the PV/EV/AC table with comma thousand separators', async () => {
    renderPage()

    expect(await screen.findByText(/12,200/)).toBeInTheDocument()
    expect(screen.getByText(/11,590/)).toBeInTheDocument()
    expect(screen.getByText(/12,220/)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/EAC: 105,436/)).toBeInTheDocument()
      expect(screen.getByText(/VAC: -5,436/)).toBeInTheDocument()
    })
  })
})
