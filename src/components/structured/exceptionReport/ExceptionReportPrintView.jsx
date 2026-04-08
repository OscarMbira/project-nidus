import { useEffect } from 'react'
import { Printer, Download, FileText, File } from 'lucide-react'
import { exportToPDF, exportToWord } from '../../../utils/exceptionReportExport'

export default function ExceptionReportPrintView({ 
  report, 
  options = [], 
  lessons = [], 
  approvals = [], 
  distribution = [],
  qualityChecks = []
}) {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        .no-print { display: none !important; }
        .print-break { page-break-after: always; }
        body { background: white !important; }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    exportToPDF(report, options, lessons, approvals, distribution, qualityChecks)
  }

  const handleExportWord = () => {
    exportToWord(report, options, lessons, approvals, distribution, qualityChecks)
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No report data available
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white text-black">
      <div className="no-print flex justify-end gap-2 mb-4">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <FileText className="h-4 w-4" />
          Export PDF
        </button>
        <button
          onClick={handleExportWord}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <File className="h-4 w-4" />
          Export Word
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold mb-4">EXCEPTION REPORT</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Document Reference:</strong> {report.document_ref || 'N/A'}</p>
            <p><strong>Version:</strong> {report.version_no || '1.0'}</p>
            <p><strong>Report Date:</strong> {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div>
            <p><strong>Status:</strong> {(report.report_status || 'draft').toUpperCase()}</p>
            <p><strong>Urgency:</strong> {(report.urgency || 'medium').toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Section 2: Exception Overview</h2>
        <p><strong>Exception Title:</strong> {report.exception_title || 'N/A'}</p>
        {report.exception_summary && (
          <p className="mt-2 whitespace-pre-wrap">{report.exception_summary}</p>
        )}
      </div>

      {report.cause_description && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Section 4: Cause Analysis</h2>
          <p className="whitespace-pre-wrap">{report.cause_description}</p>
        </div>
      )}

      {report.project_consequences && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Section 5: Consequences</h2>
          <p className="whitespace-pre-wrap">{report.project_consequences}</p>
        </div>
      )}

      {options.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Section 6: Options Analysis</h2>
          {options.map((option) => (
            <div key={option.id} className="mb-4 p-4 border border-black">
              <h3 className="font-bold">
                Option {option.option_number}: {option.option_title}
                {option.is_recommended && ' (RECOMMENDED)'}
              </h3>
              {option.option_description && (
                <p className="mt-2 whitespace-pre-wrap">{option.option_description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {report.recommendation_summary && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Section 7: Recommendation</h2>
          <p className="whitespace-pre-wrap">{report.recommendation_summary}</p>
        </div>
      )}

      {report.board_decision && (
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-black pb-2 mb-4">Board Decision</h2>
          <p className="whitespace-pre-wrap">{report.board_decision}</p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-400 text-center text-sm text-gray-600">
        <p>
          Exception Report: {report.document_ref || 'N/A'} | Version {report.version_no || '1.0'} | 
          Generated {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
