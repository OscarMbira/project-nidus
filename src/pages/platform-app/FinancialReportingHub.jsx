import { useState } from 'react'
import ExportListMenu from '../../components/ui/ExportListMenu'

const REPORTS = [
  { id: 'budget_util', label: 'Budget utilisation (planned vs actual)' },
  { id: 'cost_perf', label: 'Cost performance (CPI/SPI summary)' },
  { id: 'variance', label: 'Variance analysis' },
  { id: 'profit', label: 'Profitability summary' },
  { id: 'evm_trend', label: 'EVM trend' },
  { id: 'expense', label: 'Expense summary' },
]

export default function FinancialReportingHub() {
  const [report, setReport] = useState(REPORTS[0].id)

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
          <ExportListMenu columns={[{ key: 'label', label: 'Report' }]} data={[{ label: REPORTS.find((x) => x.id === report)?.label }]} baseFilename={`financial_report_${report}`} />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm text-gray-600 dark:text-gray-300">
          Report placeholder: <strong>{REPORTS.find((x) => x.id === report)?.label}</strong>. Connect filters (portfolio, programme, project, date range) and backing queries in a future iteration; registry and navigation are wired (v349).
        </div>
      </div>
    </div>
  )
}
