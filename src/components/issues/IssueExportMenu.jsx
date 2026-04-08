import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File, Printer } from 'lucide-react'
import { exportToCSV, exportToExcel, exportIssueToPDF, exportRegisterToPDF, generatePrintableHTML, generateRegisterPrintableHTML } from '../../utils/issueExport'

export default function IssueExportMenu({ issues, register, selectedIssue = null }) {
  const [exporting, setExporting] = useState(false)

  const handleExportCSV = () => {
    try {
      setExporting(true)
      const filename = `issue_register_${register?.register_reference || 'export'}_${new Date().toISOString().split('T')[0]}.csv`
      exportToCSV(issues, filename)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = () => {
    try {
      setExporting(true)
      const filename = `issue_register_${register?.register_reference || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`
      exportToExcel(issues, filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Error exporting Excel: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      const filename = `issue_register_${register?.register_reference || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`
      await exportRegisterToPDF(issues, register, filename)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportIssuePDF = async () => {
    if (!selectedIssue) {
      alert('Please select an issue to export')
      return
    }
    try {
      setExporting(true)
      const filename = `${selectedIssue.issue_identifier || 'issue'}_${new Date().toISOString().split('T')[0]}.pdf`
      await exportIssueToPDF(selectedIssue, filename)
    } catch (error) {
      console.error('Error exporting issue PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const html = generateRegisterPrintableHTML(issues, register)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Issue Register - ${register?.register_reference || 'Export'}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { font-family: Arial, sans-serif; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handlePrintIssue = () => {
    if (!selectedIssue) {
      alert('Please select an issue to print')
      return
    }
    const printWindow = window.open('', '_blank')
    const html = generatePrintableHTML(selectedIssue)
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Issue - ${selectedIssue.issue_identifier || 'Export'}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { font-family: Arial, sans-serif; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportCSV}
          disabled={exporting || !issues || issues.length === 0}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Export to CSV"
        >
          <FileSpreadsheet className="h-4 w-4" />
          CSV
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting || !issues || issues.length === 0}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Export to Excel"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !issues || issues.length === 0}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Export Register to PDF"
        >
          <FileText className="h-4 w-4" />
          PDF
        </button>
        {selectedIssue && (
          <button
            onClick={handleExportIssuePDF}
            disabled={exporting}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
            title="Export Selected Issue to PDF"
          >
            <FileText className="h-4 w-4" />
            Issue PDF
          </button>
        )}
        <button
          onClick={handlePrint}
          disabled={exporting || !issues || issues.length === 0}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          title="Print Register"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        {selectedIssue && (
          <button
            onClick={handlePrintIssue}
            disabled={exporting}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
            title="Print Selected Issue"
          >
            <Printer className="h-4 w-4" />
            Print Issue
          </button>
        )}
      </div>
      {exporting && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-800 text-white rounded text-sm">
          Exporting...
        </div>
      )}
    </div>
  )
}
