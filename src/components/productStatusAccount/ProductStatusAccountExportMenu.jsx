/**
 * Product Status Account Export Menu Component
 * Export options for Product Status Account
 */

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, File, Printer, X } from 'lucide-react'
import { exportPSAToPDF, exportPSAToWord, exportPSASummaryToCSV, exportPSAToExcel, generatePSAPrintView } from '../../utils/productStatusAccountExport'

export default function ProductStatusAccountExportMenu({
  psa,
  statusHistory = [],
  progressSnapshots = [],
  linkedIssues = [],
  milestones = [],
  dependencies = []
}) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleExportPDF = async () => {
    if (!psa) {
      alert('No Product Status Account data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportPSAToPDF(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    if (!psa) {
      alert('No Product Status Account data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportPSAToWord(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
    } catch (error) {
      console.error('Error exporting Word:', error)
      alert('Error exporting Word: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = () => {
    if (!psa) {
      alert('No Product Status Account data available for export')
      return
    }

    setShowMenu(false)
    try {
      exportPSASummaryToCSV([psa])
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    }
  }

  const handleExportExcel = () => {
    if (!psa) {
      alert('No Product Status Account data available for export')
      return
    }

    setShowMenu(false)
    try {
      exportPSAToExcel([psa])
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Error exporting Excel: ' + error.message)
    }
  }

  const handlePrint = () => {
    if (!psa) {
      alert('No Product Status Account data available for printing')
      return
    }

    setShowMenu(false)
    try {
      const htmlContent = generatePSAPrintView(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    } catch (error) {
      console.error('Error printing:', error)
      alert('Error printing: ' + error.message)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={handleExportPDF}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export as PDF
            </button>
            <button
              onClick={handleExportWord}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export as Word
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <File className="w-4 h-4" />
              Export as CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <File className="w-4 h-4" />
              Export as Excel
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              onClick={handlePrint}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
