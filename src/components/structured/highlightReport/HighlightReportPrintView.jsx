import { Download, Printer, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { exportHighlightReportToPDF, exportHighlightReportToWord } from '../../../utils/highlightReportExport'

export default function HighlightReportPrintView({
  report,
  products = [],
  risks = [],
  issues = [],
  tolerances = []
}) {
  if (!report) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    try {
      exportHighlightReportToPDF(report, products, risks, issues, tolerances)
    } catch (e) {
      console.error('Export PDF:', e)
      alert('Error exporting PDF: ' + e.message)
    }
  }

  const handleExportWord = () => {
    try {
      exportHighlightReportToWord(report, products, risks, issues, tolerances)
    } catch (e) {
      console.error('Export Word:', e)
      alert('Error exporting Word: ' + e.message)
    }
  }

  return (
    <div className="print-view">
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Printer className="h-5 w-5" />
          Print
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          Export PDF
        </button>
        <button
          type="button"
          onClick={handleExportWord}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          Export Word
        </button>
      </div>

      <div className="bg-white text-black dark:bg-gray-900 dark:text-gray-100 p-8 print-content rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b-2 border-gray-300 dark:border-gray-600 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {report.report_title || 'Highlight Report'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Reference:</strong> {report.report_reference || 'N/A'} | <strong>Version:</strong> {report.version_no || '1.0'} | <strong>Date:</strong> {report.report_date && format(new Date(report.report_date), 'dd MMM yyyy')}
          </p>
        </div>

        {report.executive_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Executive Summary</h2>
            <p className="whitespace-pre-wrap">{report.executive_summary}</p>
          </div>
        )}

        {report.overall_status_summary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Overall Status</h2>
            <p className="whitespace-pre-wrap">{report.overall_status_summary}</p>
          </div>
        )}

        {(report.progress_summary || report.completed_this_period || report.planned_next_period) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Progress</h2>
            {report.progress_summary && <p className="whitespace-pre-wrap mb-4">{report.progress_summary}</p>}
            {report.completed_this_period && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Completed This Period</h3>
                <p className="whitespace-pre-wrap">{report.completed_this_period}</p>
              </div>
            )}
            {report.planned_next_period && (
              <div>
                <h3 className="font-semibold mb-2">Planned Next Period</h3>
                <p className="whitespace-pre-wrap">{report.planned_next_period}</p>
              </div>
            )}
          </div>
        )}

        {products.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Products / Deliverables</h2>
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Product</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Period</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">{p.product_name || '—'}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">{(p.period_type || '').replace(/_/g, ' ')}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">{(p.completion_status || '').replace(/-/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(report.risks_summary || risks.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Risks</h2>
            {report.risks_summary && <p className="whitespace-pre-wrap mb-4">{report.risks_summary}</p>}
            {risks.length > 0 && (
              <ul className="list-disc list-inside">
                {risks.map((r) => (
                  <li key={r.id}>{r.risk_title || r.risk_description || '—'}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(report.issues_summary || issues.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Issues</h2>
            {report.issues_summary && <p className="whitespace-pre-wrap mb-4">{report.issues_summary}</p>}
            {issues.length > 0 && (
              <ul className="list-disc list-inside">
                {issues.map((i) => (
                  <li key={i.id}>{i.issue_title || i.issue_description || '—'}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(report.decisions_required || report.recommendations) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-2">Decisions &amp; Recommendations</h2>
            {report.decisions_required && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Decisions Required</h3>
                <p className="whitespace-pre-wrap">{report.decisions_required}</p>
              </div>
            )}
            {report.recommendations && (
              <div>
                <h3 className="font-semibold mb-2">Recommendations</h3>
                <p className="whitespace-pre-wrap">{report.recommendations}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
          <p>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          .print-content { max-width: 100%; margin: 0; padding: 20px; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  )
}
