import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestingDashboardPage from '../TestingDashboardPage'
import * as platform from '../../../services/testingCentreService'

vi.mock('../../../services/testingCentreService', () => ({
  hasTestingCentrePermission: vi.fn(),
  getTestingDashboardMetrics: vi.fn(),
  getTestRunDashboardMetrics: vi.fn(),
}))

vi.mock('../../../services/simTestingCentreService', () => ({}))

vi.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>
  return {
    LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub,
    ResponsiveContainer: Stub, BarChart: Stub, Bar: Stub, PieChart: Stub, Pie: Stub, Cell: Stub,
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <TestingDashboardPage />
    </MemoryRouter>,
  )
}

describe('TestingDashboardPage — permission gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.getTestingDashboardMetrics.mockResolvedValue({ success: true, data: { total_cases: 4 } })
    platform.getTestRunDashboardMetrics.mockResolvedValue({ success: true, data: { passed: 1, failed: 0 } })
  })

  it('shows a no-access message and does not request metrics when the user lacks testing_centre.view', async () => {
    platform.hasTestingCentrePermission.mockResolvedValue(false)
    renderPage()

    expect(await screen.findByText(/don't have access to the testing centre/i)).toBeInTheDocument()
    expect(platform.getTestingDashboardMetrics).not.toHaveBeenCalled()
    expect(platform.getTestRunDashboardMetrics).not.toHaveBeenCalled()
    expect(screen.queryByText('New test case')).toBeNull()
    expect(screen.queryByText(/insufficient permission/i)).toBeNull()
  })

  it('loads the dashboard when the user has testing_centre.view', async () => {
    platform.hasTestingCentrePermission.mockResolvedValue(true)
    renderPage()

    await waitFor(() => expect(platform.getTestingDashboardMetrics).toHaveBeenCalled())
    expect(await screen.findByText('Total cases')).toBeInTheDocument()
    expect(screen.getByText('New test case')).toBeInTheDocument()
    expect(screen.queryByText(/don't have access/i)).toBeNull()
  })
})
