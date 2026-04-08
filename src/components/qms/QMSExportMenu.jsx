import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Printer, FileDown } from 'lucide-react'
import { exportQMSToCSV, exportQMSToPDF, printQMS } from '../../utils/qmsExport'

export default function QMSExportMenu({ qms, standards, methods, metrics, roles, activities, tools, records, reports }) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const handleExportCSV = () => {
    try {
      setExporting(true)
      exportQMSToCSV(qms, standards || [], methods || [], metrics || [], roles || [], activities || [])
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV: ' + error.message)
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      await exportQMSToPDF(
        qms, 
        standards || [], 
        methods || [], 
        metrics || [], 
        roles || [], 
        activities || [], 
        tools || [], 
        records || [], 
        reports || []
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF: ' + error.message)
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const handlePrint = () => {
    try {
      printQMS(qms, standards || [], methods || [], metrics || [], roles || [], activities || [])
      setShowMenu(false)
    } catch (error) {
      console.error('Error printing:', error)
      alert('Error printing: ' + error.message)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        title="Export QMS"
      >
        <Download className="h-4 w-4" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      
      {showMenu && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Export to CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            Export to PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={exporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      )}
    </div>
  )
}
