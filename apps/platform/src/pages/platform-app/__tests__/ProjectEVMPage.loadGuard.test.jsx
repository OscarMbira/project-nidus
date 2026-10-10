import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectEVMPage from '../ProjectEVMPage'
import { listEvmSnapshots } from '../../../services/evmService'

const projectIdState = vi.hoisted(() => ({ value: null }))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: projectIdState.value, routeKey: 'SEED334-PRJ-06' }),
}))

vi.mock('@nidus/shared/hooks/useFinancialPermissions', () => ({
  useFinancialPermissions: () => ({ canManage: true, readOnlyExecutive: false }),
}))

vi.mock('../../../services/evmService', () => ({
  listEvmSnapshots: vi.fn(async () => []),
  upsertEvmSnapshot: vi.fn(),
  computeEvmMetrics: () => ({ spi: null, cpi: null, eac: null, vac: null }),
}))

const fromMock = vi.fn()
vi.mock('@nidus/supabase', () => ({
  platformDb: {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } } }) },
    from: (...args) => fromMock(...args),
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

describe('ProjectEVMPage — skips loading while projectId is not yet resolved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectIdState.value = null
  })

  it('does not query with a null projectId', async () => {
    renderPage()
    await screen.findByText('BAC (budget at completion)')
    expect(fromMock).not.toHaveBeenCalled()
    expect(listEvmSnapshots).not.toHaveBeenCalled()
  })
})
