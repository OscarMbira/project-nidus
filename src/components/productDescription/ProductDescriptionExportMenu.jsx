/**
 * Product Description Export Menu Component
 * Export options for Product Description
 */

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, File, Printer, X } from 'lucide-react'
import { exportProductDescriptionToPDF, exportProductDescriptionToWord, exportProductDescriptionSummaryToCSV, generateProductDescriptionPrintView } from '../../utils/productDescriptionExport'

export default function ProductDescriptionExportMenu({
  pd,
  compositionItems = [],
  derivations = [],
  acceptanceCriteria = [],
  qualityExpectations = [],
  skills = [],
  responsibilities = [],
  revisionHistory = [],
  approvals = []
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
    if (!pd) {
      alert('No Product Description data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportProductDescriptionToPDF(
        pd,
        compositionItems,
        derivations,
        acceptanceCriteria,
        qualityExpectations,
        skills,
        responsibilities,
        revisionHistory,
        approvals
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    if (!pd) {
      alert('No Product Description data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportProductDescriptionToWord(
        pd,
        compositionItems,
        derivations,
        acceptanceCriteria,
        qualityExpectations,
        skills,
        responsibilities,
        revisionHistory,
        approvals
      )
    } catch (error) {
      console.error('Error exporting Word:', error)
      alert('Error exporting Word: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = () => {
    if (!pd) {
      alert('No Product Description data available for export')
      return
    }

    setShowMenu(false)
    try {
      const csv = exportProductDescriptionSummaryToCSV(
        pd,
        acceptanceCriteria,
        qualityExpectations,
        skills
      )
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `PD-${pd.pd_reference || pd.id}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    }
  }

  const handlePrint = () => {
    if (!pd) {
      alert('No Product Description data available for print')
      return
    }

    setShowMenu(false)
    try {
      const printHTML = generateProductDescriptionPrintView(
        pd,
        compositionItems,
        derivations,
        acceptanceCriteria,
        qualityExpectations,
        skills,
        responsibilities,
        revisionHistory,
        approvals
      )

      const printWindow = window.open('', '_blank')
      printWindow.document.write(printHTML)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
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
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </button>
            <button
              onClick={handleExportWord}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <File className="w-4 h-4 mr-2" />
              Export as Word
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export Summary (CSV)
            </button>
            <button
              onClick={handlePrint}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print View
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
