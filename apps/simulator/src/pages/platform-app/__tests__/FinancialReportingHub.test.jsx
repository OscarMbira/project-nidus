import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FinancialReportingHub from '../FinancialReportingHub'
import { getByProjectId } from '../../../services/projectBudgetCategoryService'
import { listCostActuals } from '../../../services/costActualsService'
import { listEvmSnapshots } from '../../../services/evmService'
import { listRevenueEntries, sumAmounts } from '../../../services/projectRevenueService'
import { listCostEntries } from '../../../services/projectCostService'
import { listExpenseClaimsForProject } from '../../../services/expenseClaimService'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'p-1', routeKey: 'SEED334-PRJ-08' }),
}))

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('../../../services/costActualsService', () => ({
  listCostActuals: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('../../../services/evmService', () => ({
  listEvmSnapshots: vi.fn(async () => []),
  computeEvmMetrics: (snapshot, bac) => {
    const pv = Number(snapshot.planned_value) || 0
    const ev = Number(snapshot.earned_value) || 0
    const ac = Number(snapshot.actual_cost) || 0
    const bacN = Number(bac) || 0
    const spi = pv !== 0 ? ev / pv : null
    const cpi = ac !== 0 ? ev / ac : null
    const eac = cpi ? bacN / cpi : null
    const vac = eac != null ? bacN - eac : null
    return { sv: ev - pv, cv: ev - ac, spi, cpi, eac, vac }
  },
}))

vi.mock('../../../services/projectRevenueService', () => ({
  listRevenueEntries: vi.fn(async () => []),
  sumAmounts: (rows) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
}))

vi.mock('../../../services/projectCostService', () => ({
  listCostEntries: vi.fn(async () => []),
}))

vi.mock('../../../services/expenseClaimService', () => ({
  listExpenseClaimsForProject: vi.fn(async () => []),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FinancialReportingHub />
    </MemoryRouter>,
  )
}

async function selectReport(label) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: label } })
}

describe('FinancialReportingHub — real queries per report type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Budget utilisation: shows planned, actual, and variance by category', async () => {
    getByProjectId.mockResolvedValue({ success: true, data: [{ category_name: 'Labour', budget_amount: 50000 }] })
    listCostActuals.mockResolvedValue({ success: true, data: [{ category: 'Labour', amount: 42000, transaction_type: 'actual' }] })

    renderPage()

    await waitFor(() => expect(getByProjectId).toHaveBeenCalledWith('p-1'))
    const table = await screen.findByRole('table')
    const labourRow = within(table).getByText('Labour').closest('tr')
    expect(within(labourRow).getByText('50,000')).toBeInTheDocument()
    expect(within(labourRow).getByText('42,000')).toBeInTheDocument()
    expect(screen.getByTestId('chart-budget_util')).toBeInTheDocument()
  })

  it('Cost performance: shows SPI/CPI from the latest EVM snapshot', async () => {
    getByProjectId.mockResolvedValue({ success: true, data: [{ category_name: 'Labour', budget_amount: 100000 }] })
    listEvmSnapshots.mockResolvedValue([
      { period_date: '2026-01-31', planned_value: 50000, earned_value: 47500, actual_cost: 50100 },
    ])

    renderPage()
    await selectReport('cost_perf')

    expect(await screen.findByText(/SPI/)).toBeInTheDocument()
    expect(screen.getByText(/0.950/)).toBeInTheDocument()
    expect(screen.getByTestId('chart-cost_perf')).toBeInTheDocument()
  })

  it('Variance analysis: shows SV/CV per period', async () => {
    listEvmSnapshots.mockResolvedValue([
      { period_date: '2026-01-31', planned_value: 50000, earned_value: 47500, actual_cost: 50100 },
    ])

    renderPage()
    await selectReport('variance')

    const table = await screen.findByRole('table')
    expect(within(table).getByText('2026-01-31')).toBeInTheDocument()
    expect(within(table).getByText('-2,500')).toBeInTheDocument()
    expect(screen.getByTestId('chart-variance')).toBeInTheDocument()
  })

  it('Profitability summary: shows revenue, cost, and margin', async () => {
    listRevenueEntries.mockResolvedValue([{ id: 'r1', amount: 200000 }])
    listCostEntries.mockResolvedValue([{ id: 'c1', amount: 150000 }])

    renderPage()
    await selectReport('profit')

    const revenueCard = await screen.findByText('Total revenue')
    expect(within(revenueCard.parentElement).getByText('200,000')).toBeInTheDocument()
    const costCard = screen.getByText('Total cost')
    expect(within(costCard.parentElement).getByText('150,000')).toBeInTheDocument()
    const marginCard = screen.getByText('Gross profit / margin').closest('div').parentElement
    expect(marginCard.textContent).toContain('50,000')
    expect(screen.getByTestId('chart-profit')).toBeInTheDocument()
  })

  it('EVM trend: lists all snapshots with formatted figures', async () => {
    listEvmSnapshots.mockResolvedValue([
      { period_date: '2026-01-31', planned_value: 110000, earned_value: 102000, actual_cost: 98500 },
    ])

    renderPage()
    await selectReport('evm_trend')

    expect(await screen.findByText('110,000')).toBeInTheDocument()
    expect(screen.getByTestId('chart-evm_trend')).toBeInTheDocument()
  })

  it('Expense summary: totals claims by status for the project', async () => {
    listExpenseClaimsForProject.mockResolvedValue([
      { id: 'e1', claim_status: 'fully_approved', amount: 470.25 },
      { id: 'e2', claim_status: 'draft', amount: 120 },
    ])

    renderPage()
    await selectReport('expense')

    const table = await screen.findByRole('table')
    expect(within(table).getByText(/fully approved/i)).toBeInTheDocument()
    expect(within(table).getByText('470.25')).toBeInTheDocument()
    expect(screen.getByTestId('chart-expense')).toBeInTheDocument()
  })
})
