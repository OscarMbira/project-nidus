/**
 * RMS Export Menu Component
 * Export options for Risk Management Strategy
 */

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, File, Printer, X } from 'lucide-react'
import { exportRMSToPDF, exportRMSToWord } from '../../utils/rmsExport'

export default function RMSExportMenu({ rms, standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, activities, onPrint }) {
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
    if (!rms) {
      alert('No RMS data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportRMSToPDF(
        rms,
        standards || [],
        methods || [],
        scales || [],
        matrices || [],
        strategies || [],
        tools || [],
        templates || [],
        records || [],
        reports || [],
        roles || [],
        activities || []
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportWord = async () => {
    if (!rms) {
      alert('No RMS data available for export')
      return
    }

    setExporting(true)
    setShowMenu(false)
    try {
      await exportRMSToWord(
        rms,
        standards || [],
        methods || [],
        scales || [],
        matrices || [],
        strategies || [],
        tools || [],
        templates || [],
        records || [],
        reports || [],
        roles || [],
        activities || []
      )
    } catch (error) {
      console.error('Error exporting Word:', error)
      alert('Error exporting Word: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    setShowMenu(false)
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  if (!rms) {
    return null
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={exporting}
      >
        <Download className="h-4 w-4" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Export as PDF
          </button>
          <button
            onClick={handleExportWord}
            disabled={exporting}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            <File className="h-4 w-4" />
            Export as Word
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={handlePrint}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      )}
    </div>
  )
}
