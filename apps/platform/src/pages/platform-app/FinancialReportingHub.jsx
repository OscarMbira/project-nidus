import { useEffect, useState } from 'react'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getByProjectId } from '../../services/projectBudgetCategoryService'
import { listCostActuals } from '../../services/costActualsService'
import { listEvmSnapshots, computeEvmMetrics } from '../../services/evmService'
import { listRevenueEntries, sumAmounts } from '../../services/projectRevenueService'
import { listCostEntries } from '../../services/projectCostService'
import { listExpenseClaimsForProject } from '../../services/expenseClaimService'

const REPORTS = [
  { id: 'budget_util', label: 'Budget utilisation (planned vs actual)' },
  { id: 'cost_perf', label: 'Cost performance (CPI/SPI summary)' },
  { id: 'variance', label: 'Variance analysis' },
  { id: 'profit', label: 'Profitability summary' },
  { id: 'evm_trend', label: 'EVM trend' },
  { id: 'expense', label: 'Expense summary' },
]

function fmt(n) {
  return Number(n || 0).toLocaleString()
}

const CHART_W = 640
const CHART_H = 220
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

function ChartShell({ testId, title, empty, children }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</div>
      {empty ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No data to chart yet.</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  )
}

/** Grouped bars: planned vs actual per category. */
function BudgetUtilChart({ rows }) {
  if (rows.length === 0) return <ChartShell testId="chart-budget_util" title="Planned vs actual by category" empty />
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const maxVal = Math.max(...rows.flatMap((r) => [r.planned, r.actual]), 1)
  const groupW = innerW / rows.length
  const barW = Math.min(28, groupW / 3)
  return (
    <ChartShell testId="chart-budget_util" title="Planned vs actual by category">
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        {rows.map((r, i) => {
          const cx = PAD.left + i * groupW + groupW / 2
          const plannedH = (r.planned / maxVal) * innerH
          const actualH = (r.actual / maxVal) * innerH
          return (
            <g key={r.category}>
              <rect x={cx - barW - 2} y={PAD.top + innerH - plannedH} width={barW} height={plannedH} fill="#3B82F6" rx="2" />
              <rect x={cx + 2} y={PAD.top + innerH - actualH} width={barW} height={actualH} fill={r.actual > r.planned ? '#EF4444' : '#10B981'} rx="2" />
              <text x={cx} y={PAD.top + innerH + 16} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400">
                {r.category.length > 10 ? `${r.category.slice(0, 9)}…` : r.category}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6] inline-block" /> Planned</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] inline-block" /> Actual</span>
      </div>
    </ChartShell>
  )
}

/** Horizontal gauge bars for SPI/CPI against the 1.0 on-track reference line. */
function CostPerfChart({ metrics }) {
  if (!metrics) return <ChartShell testId="chart-cost_perf" title="SPI / CPI vs on-track (1.0)" empty />
  const gauges = [
    { label: 'SPI', value: metrics.spi },
    { label: 'CPI', value: metrics.cpi },
  ]
  const scaleMax = 1.5
  const innerW = CHART_W - PAD.left - PAD.right
  return (
    <ChartShell testId="chart-cost_perf" title="SPI / CPI vs on-track (1.0)">
      <svg width={CHART_W} height={120} viewBox={`0 0 ${CHART_W} 120`}>
        {gauges.map((g, i) => {
          const y = 20 + i * 50
          const val = Math.max(0, Math.min(scaleMax, g.value ?? 0))
          const w = (val / scaleMax) * innerW
          const color = val >= 1 ? '#10B981' : val >= 0.9 ? '#F59E0B' : '#EF4444'
          const refX = PAD.left + (1 / scaleMax) * innerW
          return (
            <g key={g.label}>
              <text x={PAD.left - 10} y={y + 14} textAnchor="end" className="text-xs fill-gray-600 dark:fill-gray-300">{g.label}</text>
              <rect x={PAD.left} y={y} width={innerW} height={20} fill="#E5E7EB" className="dark:fill-gray-700" rx="4" />
              <rect x={PAD.left} y={y} width={w} height={20} fill={color} rx="4" />
              <line x1={refX} y1={y - 4} x2={refX} y2={y + 24} stroke="currentColor" className="text-gray-500 dark:text-gray-300" strokeDasharray="3" />
              <text x={PAD.left + innerW + 6} y={y + 14} className="text-xs font-semibold fill-gray-900 dark:fill-white">
                {g.value != null ? g.value.toFixed(2) : '—'}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartShell>
  )
}

/** Dual-line chart of SV and CV across periods. */
function VarianceChart({ points }) {
  if (points.length === 0) return <ChartShell testId="chart-variance" title="Schedule / cost variance over time" empty />
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const allVals = points.flatMap((p) => [p.sv, p.cv])
  const maxAbs = Math.max(...allVals.map(Math.abs), 1)
  const zeroY = PAD.top + innerH / 2
  const stepX = innerW / Math.max(1, points.length - 1)
  const scaleY = (v) => zeroY - (v / maxAbs) * (innerH / 2)
  const line = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD.left + i * stepX} ${scaleY(p[key])}`).join(' ')
  return (
    <ChartShell testId="chart-variance" title="Schedule / cost variance over time">
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <line x1={PAD.left} y1={zeroY} x2={PAD.left + innerW} y2={zeroY} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        <path d={line('sv')} fill="none" stroke="#3B82F6" strokeWidth="2" />
        <path d={line('cv')} fill="none" stroke="#F59E0B" strokeWidth="2" />
        {points.map((p, i) => (
          <text key={p.period_date} x={PAD.left + i * stepX} y={PAD.top + innerH + 16} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400">
            {p.period_date}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#3B82F6] inline-block" /> SV</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#F59E0B] inline-block" /> CV</span>
      </div>
    </ChartShell>
  )
}

/** Three-bar comparison: revenue, cost, profit. */
function ProfitChart({ revenue, cost, profit }) {
  if (revenue === 0 && cost === 0) return <ChartShell testId="chart-profit" title="Revenue vs cost vs profit" empty />
  const bars = [
    { label: 'Revenue', value: revenue, color: '#3B82F6' },
    { label: 'Cost', value: cost, color: '#F59E0B' },
    { label: 'Profit', value: profit, color: profit >= 0 ? '#10B981' : '#EF4444' },
  ]
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const maxVal = Math.max(...bars.map((b) => Math.abs(b.value)), 1)
  const groupW = innerW / bars.length
  const barW = Math.min(60, groupW / 2)
  return (
    <ChartShell testId="chart-profit" title="Revenue vs cost vs profit">
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        {bars.map((b, i) => {
          const cx = PAD.left + i * groupW + groupW / 2
          const h = (Math.abs(b.value) / maxVal) * innerH
          return (
            <g key={b.label}>
              <rect x={cx - barW / 2} y={PAD.top + innerH - h} width={barW} height={h} fill={b.color} rx="3" />
              <text x={cx} y={PAD.top + innerH - h - 6} textAnchor="middle" className="text-[10px] font-semibold fill-gray-900 dark:fill-white">
                {fmt(b.value)}
              </text>
              <text x={cx} y={PAD.top + innerH + 16} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400">{b.label}</text>
            </g>
          )
        })}
      </svg>
    </ChartShell>
  )
}

/** Triple-line chart of PV / EV / AC across periods. */
function EvmTrendChart({ points }) {
  if (points.length === 0) return <ChartShell testId="chart-evm_trend" title="PV / EV / AC over time" empty />
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const maxVal = Math.max(...points.flatMap((p) => [p.planned_value, p.earned_value, p.actual_cost]), 1)
  const stepX = innerW / Math.max(1, points.length - 1)
  const scaleY = (v) => PAD.top + innerH - ((Number(v) || 0) / maxVal) * innerH
  const line = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD.left + i * stepX} ${scaleY(p[key])}`).join(' ')
  return (
    <ChartShell testId="chart-evm_trend" title="PV / EV / AC over time">
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        <path d={line('planned_value')} fill="none" stroke="#3B82F6" strokeWidth="2" />
        <path d={line('earned_value')} fill="none" stroke="#10B981" strokeWidth="2" />
        <path d={line('actual_cost')} fill="none" stroke="#EF4444" strokeWidth="2" />
        {points.map((p, i) => (
          <text key={p.period_date} x={PAD.left + i * stepX} y={PAD.top + innerH + 16} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400">
            {p.period_date}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#3B82F6] inline-block" /> PV</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#10B981] inline-block" /> EV</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#EF4444] inline-block" /> AC</span>
      </div>
    </ChartShell>
  )
}

/** Bar per claim status, height = total amount. */
function ExpenseStatusChart({ entries }) {
  if (entries.length === 0) return <ChartShell testId="chart-expense" title="Claimed amount by status" empty />
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const maxVal = Math.max(...entries.map((e) => e.total), 1)
  const groupW = innerW / entries.length
  const barW = Math.min(44, groupW / 2)
  return (
    <ChartShell testId="chart-expense" title="Claimed amount by status">
      <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        {entries.map((e, i) => {
          const cx = PAD.left + i * groupW + groupW / 2
          const h = (e.total / maxVal) * innerH
          return (
            <g key={e.status}>
              <rect x={cx - barW / 2} y={PAD.top + innerH - h} width={barW} height={h} fill="#8B5CF6" rx="3" />
              <text x={cx} y={PAD.top + innerH - h - 6} textAnchor="middle" className="text-[10px] font-semibold fill-gray-900 dark:fill-white">
                {fmt(e.total)}
              </text>
              <text x={cx} y={PAD.top + innerH + 16} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400 capitalize">
                {e.status.replace(/_/g, ' ').slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartShell>
  )
}

export default function FinancialReportingHub() {
  const { projectId } = usePlatformProjectId()
  const [report, setReport] = useState(REPORTS[0].id)
  const [loading, setLoading] = useState(false)
  const [budgetRows, setBudgetRows] = useState([])
  const [evmSnapshots, setEvmSnapshots] = useState([])
  const [revenue, setRevenue] = useState([])
  const [costEntries, setCostEntries] = useState([])
  const [expenseClaims, setExpenseClaims] = useState([])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      if (report === 'budget_util') {
        const [budget, actuals] = await Promise.all([
          getByProjectId(projectId),
          listCostActuals(projectId, { transactionType: 'actual' }),
        ])
        if (cancelled) return
        const actualByCategory = new Map()
        for (const a of actuals.data || []) {
          const key = a.category || 'Uncategorised'
          actualByCategory.set(key, (actualByCategory.get(key) || 0) + (Number(a.amount) || 0))
        }
        setBudgetRows(
          (budget.data || []).map((b) => ({
            category: b.category_name,
            planned: Number(b.budget_amount) || 0,
            actual: actualByCategory.get(b.category_name) || 0,
          })),
        )
      } else if (report === 'cost_perf' || report === 'variance' || report === 'evm_trend') {
        const [budget, snaps] = await Promise.all([getByProjectId(projectId), listEvmSnapshots(projectId)])
        if (cancelled) return
        setBudgetRows((budget.data || []).map((b) => ({ category: b.category_name, planned: Number(b.budget_amount) || 0, actual: 0 })))
        setEvmSnapshots(snaps)
      } else if (report === 'profit') {
        const [rev, costs] = await Promise.all([listRevenueEntries(projectId), listCostEntries(projectId)])
        if (cancelled) return
        setRevenue(rev)
        setCostEntries(costs)
      } else if (report === 'expense') {
        const claims = await listExpenseClaimsForProject(projectId)
        if (cancelled) return
        setExpenseClaims(claims)
      }
      if (!cancelled) setLoading(false)
    })().catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [report, projectId])

  const bac = budgetRows.reduce((sum, b) => sum + b.planned, 0)
  const latestSnapshot = evmSnapshots[evmSnapshots.length - 1]
  const latestMetrics = latestSnapshot ? computeEvmMetrics(latestSnapshot, bac) : null
  const variancePoints = evmSnapshots.map((s) => {
    const m = computeEvmMetrics(s, bac)
    return { period_date: s.period_date, sv: m.sv, cv: m.cv }
  })
  const revTotal = sumAmounts(revenue)
  const costTotal = sumAmounts(costEntries)
  const grossProfit = revTotal - costTotal
  const margin = revTotal !== 0 ? (grossProfit / revTotal) * 100 : null

  const expenseByStatus = new Map()
  for (const c of expenseClaims) {
    const key = c.claim_status || 'draft'
    const entry = expenseByStatus.get(key) || { count: 0, total: 0 }
    entry.count += 1
    entry.total += Number(c.amount) || 0
    expenseByStatus.set(key, entry)
  }

  const exportCols = {
    budget_util: [
      { key: 'category', label: 'Category' },
      { key: 'planned', label: 'Planned' },
      { key: 'actual', label: 'Actual' },
    ],
    cost_perf: [
      { key: 'spi', label: 'SPI' },
      { key: 'cpi', label: 'CPI' },
      { key: 'eac', label: 'EAC' },
      { key: 'vac', label: 'VAC' },
    ],
    variance: [
      { key: 'period_date', label: 'Period' },
      { key: 'sv', label: 'SV' },
      { key: 'cv', label: 'CV' },
    ],
    profit: [
      { key: 'revenue', label: 'Revenue' },
      { key: 'cost', label: 'Cost' },
      { key: 'margin', label: 'Margin %' },
    ],
    evm_trend: [
      { key: 'period_date', label: 'Period' },
      { key: 'planned_value', label: 'PV' },
      { key: 'earned_value', label: 'EV' },
      { key: 'actual_cost', label: 'AC' },
    ],
    expense: [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Count' },
      { key: 'total', label: 'Total' },
    ],
  }

  const exportData = {
    budget_util: budgetRows,
    cost_perf: latestMetrics ? [{ spi: latestMetrics.spi?.toFixed(3), cpi: latestMetrics.cpi?.toFixed(3), eac: latestMetrics.eac?.toFixed(0), vac: latestMetrics.vac?.toFixed(0) }] : [],
    variance: evmSnapshots.map((s) => {
      const m = computeEvmMetrics(s, bac)
      return { period_date: s.period_date, sv: m.sv, cv: m.cv }
    }),
    profit: [{ revenue: revTotal, cost: costTotal, margin: margin?.toFixed(1) }],
    evm_trend: evmSnapshots,
    expense: Array.from(expenseByStatus.entries()).map(([status, v]) => ({ status, count: v.count, total: v.total })),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Financial reporting hub</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a report type. Data is loaded from live project financial tables (costs, revenue, EVM). Use project and programme pages for detailed drill-down.
        </p>
        <div className="flex flex-wrap gap-3">
          <select value={report} onChange={(e) => setReport(e.target.value)} className="rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-sm">
            {REPORTS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <ExportListMenu columns={exportCols[report]} data={exportData[report]} baseFilename={`financial_report_${report}`} disabled={loading} />
        </div>

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

        {!loading && report === 'budget_util' && (
          <div className="space-y-4">
          <BudgetUtilChart rows={budgetRows} />
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Planned</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No budget lines recorded for this project.</td></tr>
                ) : budgetRows.map((b, index) => (
                  <tr key={b.category} className="border-t border-gray-100 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2">{b.category}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(b.planned)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(b.actual)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(b.planned - b.actual)}</td>
                  </tr>
                ))}
              </tbody>
              {budgetRows.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(bac)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(budgetRows.reduce((s, b) => s + b.actual, 0))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(bac - budgetRows.reduce((s, b) => s + b.actual, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </div>
        )}

        {!loading && report === 'cost_perf' && (
          <div className="space-y-4">
            <CostPerfChart metrics={latestMetrics} />
            {latestMetrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">SPI: {latestMetrics.spi != null ? latestMetrics.spi.toFixed(3) : '—'}</div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">CPI: {latestMetrics.cpi != null ? latestMetrics.cpi.toFixed(3) : '—'}</div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">EAC: {latestMetrics.eac != null ? fmt(latestMetrics.eac.toFixed(0)) : '—'}</div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">VAC: {latestMetrics.vac != null ? fmt(latestMetrics.vac.toFixed(0)) : '—'}</div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No EVM snapshots recorded for this project yet.</p>
            )}
          </div>
        )}

        {!loading && report === 'variance' && (
          <div className="space-y-4">
          <VarianceChart points={variancePoints} />
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">SV (schedule variance)</th>
                  <th className="px-3 py-2 text-right">CV (cost variance)</th>
                </tr>
              </thead>
              <tbody>
                {evmSnapshots.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No EVM snapshots recorded for this project yet.</td></tr>
                ) : evmSnapshots.map((s, index) => {
                  const m = computeEvmMetrics(s, bac)
                  return (
                    <tr key={s.id || s.period_date} className="border-t border-gray-100 dark:border-gray-800">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-2">{s.period_date}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(m.sv)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(m.cv)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {!loading && report === 'profit' && (
          <div className="space-y-4">
          <ProfitChart revenue={revTotal} cost={costTotal} profit={grossProfit} />
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="text-xs text-gray-500">Total revenue</div>
              <div className="text-2xl font-semibold tabular-nums">{fmt(revTotal)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="text-xs text-gray-500">Total cost</div>
              <div className="text-2xl font-semibold tabular-nums">{fmt(costTotal)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="text-xs text-gray-500">Gross profit / margin</div>
              <div className="text-2xl font-semibold tabular-nums">{fmt(grossProfit)} {margin != null ? `(${margin.toFixed(1)}%)` : ''}</div>
            </div>
          </div>
          </div>
        )}

        {!loading && report === 'evm_trend' && (
          <div className="space-y-4">
          <EvmTrendChart points={evmSnapshots} />
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">PV</th>
                  <th className="px-3 py-2 text-right">EV</th>
                  <th className="px-3 py-2 text-right">AC</th>
                </tr>
              </thead>
              <tbody>
                {evmSnapshots.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No EVM snapshots recorded for this project yet.</td></tr>
                ) : evmSnapshots.map((s, index) => (
                  <tr key={s.id || s.period_date} className="border-t border-gray-100 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2">{s.period_date}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(s.planned_value)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(s.earned_value)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(s.actual_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {!loading && report === 'expense' && (
          <div className="space-y-4">
          <ExpenseStatusChart entries={exportData.expense} />
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {expenseByStatus.size === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No expense claims recorded for this project yet.</td></tr>
                ) : Array.from(expenseByStatus.entries()).map(([status, v], index) => (
                  <tr key={status} className="border-t border-gray-100 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2 capitalize">{status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
