/**
 * Content-parity regression test for PmoAdminOverviewWidget (v982 Phase 5 follow-up) — proves
 * the extraction from pages/platform-app/Dashboard.jsx preserved the exact wave-1/wave-2 fetch
 * orchestration (rule 66 — no redundant/reordered fetching introduced by the extraction) and
 * passes PMODashboardScopeTabs the same shape of props the original inline render did.
 * PMODashboardScopeTabs and its own nested lazy children are mocked here — this test is about
 * PmoAdminOverviewWidget's own extracted logic, not re-testing PMODashboardScopeTabs' internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPlatformDb, mockGetExecutiveSummary, mockGetKPIs, mockGetPmoExtendedMetrics } = vi.hoisted(() => ({
  mockPlatformDb: { auth: { getUser: vi.fn() }, rpc: vi.fn() },
  mockGetExecutiveSummary: vi.fn(),
  mockGetKPIs: vi.fn(),
  mockGetPmoExtendedMetrics: vi.fn(),
}))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(() => Promise.resolve('acct-1')),
}))
vi.mock('../../../../services/dashboardService', () => ({
  getExecutiveSummary: mockGetExecutiveSummary,
  getKPIs: mockGetKPIs,
  getPmoExtendedMetrics: mockGetPmoExtendedMetrics,
}))
vi.mock('../../../app/dashboard/PMODashboardScopeTabs', () => ({
  default: (props) => (
    <div data-testid="scope-tabs" data-analytics-status={props.analyticsStatus} data-org-admin={String(props.isOrgAdmin)}>
      {props.children}
    </div>
  ),
}))
vi.mock('../../../app/dashboard/ExecutiveSummary', () => ({ default: () => <div data-testid="exec-summary" /> }))
vi.mock('../../../ai/AIInsightsPanel', () => ({ default: () => <div data-testid="ai-insights" /> }))
vi.mock('../../../app/dashboard/PMOExecutiveAlertsPanel', () => ({ default: () => <div data-testid="exec-alerts" /> }))

import PmoAdminOverviewWidget from '../PmoAdminOverviewWidget'

describe('PmoAdminOverviewWidget — content parity with pre-extraction Dashboard.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockPlatformDb.rpc.mockResolvedValue({ data: true, error: null })
  })

  it('fetches wave 1 (executive summary + KPIs) before wave 2 (extended metrics), same as the original', async () => {
    const callOrder = []
    mockGetExecutiveSummary.mockImplementation(async () => { callOrder.push('executive'); return { success: true, data: { portfolios: {} } } })
    mockGetKPIs.mockImplementation(async () => { callOrder.push('kpis'); return { success: true, data: {} } })
    mockGetPmoExtendedMetrics.mockImplementation(async () => { callOrder.push('extended'); return { success: true, data: { alerts: {} } } })

    render(<MemoryRouter><PmoAdminOverviewWidget /></MemoryRouter>)

    await waitFor(() => expect(mockGetPmoExtendedMetrics).toHaveBeenCalled())
    // wave 1 both fired before wave 2 started
    expect(callOrder.indexOf('extended')).toBeGreaterThan(callOrder.indexOf('executive'))
    expect(callOrder.indexOf('extended')).toBeGreaterThan(callOrder.indexOf('kpis'))
  })

  it('renders exactly one Executive Summary, one AI Insights panel, and one Executive Alerts panel, same as the original composition', async () => {
    mockGetExecutiveSummary.mockResolvedValue({ success: true, data: {} })
    mockGetKPIs.mockResolvedValue({ success: true, data: {} })
    mockGetPmoExtendedMetrics.mockResolvedValue({ success: true, data: { alerts: {} } })

    render(<MemoryRouter><PmoAdminOverviewWidget /></MemoryRouter>)

    await waitFor(() => expect(screen.getByTestId('exec-summary')).toBeInTheDocument())
    expect(screen.getByTestId('ai-insights')).toBeInTheDocument()
    expect(screen.getByTestId('exec-alerts')).toBeInTheDocument()
  })

  it('passes analyticsStatus "ok" through to PMODashboardScopeTabs once wave 1 resolves, matching the original prop contract', async () => {
    mockGetExecutiveSummary.mockResolvedValue({ success: true, data: {} })
    mockGetKPIs.mockResolvedValue({ success: true, data: {} })
    mockGetPmoExtendedMetrics.mockResolvedValue({ success: true, data: { alerts: {} } })

    render(<MemoryRouter><PmoAdminOverviewWidget /></MemoryRouter>)

    await waitFor(() => expect(screen.getByTestId('scope-tabs')).toHaveAttribute('data-analytics-status', 'ok'))
  })

  it('degrades to an error status without throwing when wave 1 fails', async () => {
    mockGetExecutiveSummary.mockResolvedValue({ success: false, error: 'boom' })
    mockGetKPIs.mockResolvedValue({ success: true, data: {} })

    render(<MemoryRouter><PmoAdminOverviewWidget /></MemoryRouter>)

    await waitFor(() => expect(screen.getByTestId('scope-tabs')).toHaveAttribute('data-analytics-status', 'error'))
    expect(mockGetPmoExtendedMetrics).not.toHaveBeenCalled()
  })
})
