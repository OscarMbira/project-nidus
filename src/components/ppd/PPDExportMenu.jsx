import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Printer, File } from 'lucide-react'
import {
  exportPPDToCSV,
  exportPPDToPDF,
  printPPD,
  exportAcceptanceReportToCSV
} from '../../utils/ppdExport'

export default function PPDExportMenu({ ppd, compositionItems, criteria, expectations, skills, responsibilities, acceptanceStatus = null }) {
  const [exporting, setExporting] = useState(false)

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      exportPPDToCSV(ppd, compositionItems || [], criteria || [])
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      await exportPPDToPDF(
        ppd,
        compositionItems || [],
        criteria || [],
        expectations || [],
        skills || [],
        responsibilities || []
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    try {
      printPPD(
        ppd,
        compositionItems || [],
        criteria || [],
        expectations || [],
        skills || [],
        responsibilities || []
      )
    } catch (error) {
      console.error('Error printing:', error)
      alert('Error printing: ' + error.message)
    }
  }

  const handleExportAcceptanceReport = () => {
    try {
      if (!acceptanceStatus) {
        alert('No acceptance status data available')
        return
      }
      exportAcceptanceReportToCSV(acceptanceStatus, criteria || [])
    } catch (error) {
      console.error('Error exporting acceptance report:', error)
      alert('Error exporting acceptance report: ' + error.message)
    }
  }

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Export to CSV"
        >
          <FileSpreadsheet className="h-4 w-4" />
          CSV
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Export to PDF"
        >
          <FileText className="h-4 w-4" />
          PDF
        </button>
        <button
          onClick={handlePrint}
          disabled={exporting}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Print"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        {acceptanceStatus && (
          <button
            onClick={handleExportAcceptanceReport}
            disabled={exporting}
            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
            title="Export Acceptance Report"
          >
            <File className="h-4 w-4" />
            Acceptance Report
          </button>
        )}
      </div>
      {exporting && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
          Exporting...
        </div>
      )}
    </div>
  )
}
