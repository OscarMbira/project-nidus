/**
 * PID Export Menu Component
 * Provides export options for Project Initiation Document
 */

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react'
import { exportPIDToPDF, exportPIDToWord, exportPIDSummaryToCSV, exportPIDToExcel, generatePIDPrintView } from '../../utils/pidExport'

export default function PIDExportMenu({ pid, objectives = [], interfaces = [], dependencies = [], teamMembers = [], tolerances = [], reportingArrangements = [] }) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = async (format) => {
    try {
      setExporting(true)
      setShowMenu(false)
      
      switch (format) {
        case 'pdf':
          await exportPIDToPDF(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
          break
        case 'word':
          await exportPIDToWord(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
          break
        case 'csv':
          await exportPIDSummaryToCSV(pid, objectives)
          break
        case 'excel':
          await exportPIDToExcel(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
          break
        case 'print':
          generatePIDPrintView(pid, objectives, interfaces, dependencies, teamMembers, tolerances, reportingArrangements)
          break
        default:
          alert('Export format not supported')
      }
    } catch (error) {
      console.error('Error exporting PID:', error)
      alert('Error exporting: ' + error.message)
    } finally {
      setExporting(false)
    }
  }


  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('word')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export as Word
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Summary (CSV)
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('print')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print View
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
