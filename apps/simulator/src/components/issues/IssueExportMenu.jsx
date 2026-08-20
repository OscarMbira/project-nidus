/**
 * Issue Register Export Menu — single dropdown for register + list formats.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Table2,
  Presentation,
  Code,
  Braces,
} from 'lucide-react'
import {
  exportToCSV,
  exportToExcel as exportIssuesToExcel,
  exportIssueToPDF,
  exportRegisterToPDF,
  generatePrintableHTML,
  generateRegisterPrintableHTML,
} from '@nidus/shared/utils/issueExport'
import {
  exportToExcel,
  exportListToWord,
  exportListToPPT,
  exportListToCSV,
  exportListToXML,
  exportListToJSON,
  exportListToPrint,
  DEFAULT_LIST_EXPORT_FIELDS,
  MAX_LIST_EXPORT_FIELDS,
} from '@nidus/shared/utils/exportUtils'
import { withExportRowNumbers } from '@nidus/shared/utils/tableRowNumberUtils'

export default function IssueExportMenu({
  issues,
  register,
  selectedIssue = null,
  columns = [],
  data = [],
  baseFilename = 'IssueRegister',
}) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [fieldModal, setFieldModal] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(() =>
    (columns || []).map((c) => c.key).filter(Boolean).slice(0, DEFAULT_LIST_EXPORT_FIELDS)
  )
  const menuRef = useRef(null)

  const listRows = data?.length ? data : (issues || [])
  const hasIssues = Array.isArray(issues) && issues.length > 0
  const hasListData = listRows.length > 0
  const allKeys = useMemo(() => (columns || []).map((c) => c.key).filter(Boolean), [columns])
  const selectedColumns = useMemo(
    () => (columns || []).filter((c) => selectedKeys.includes(c.key)),
    [columns, selectedKeys]
  )

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resolveExport = (cols, rows) => withExportRowNumbers(cols, rows, { includeRowNumbers: true })

  const toggleKey = (key) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= MAX_LIST_EXPORT_FIELDS) return prev
      return [...prev, key]
    })
  }

  const openFieldModal = (type) => {
    setSelectedKeys((prev) => {
      const keys = (columns || []).map((c) => c.key).filter(Boolean)
      if (prev.length > 0) return prev.slice(0, MAX_LIST_EXPORT_FIELDS)
      return keys.slice(0, DEFAULT_LIST_EXPORT_FIELDS)
    })
    setShowMenu(false)
    setFieldModal(type)
  }

  const handleExportCSV = () => {
    try {
      setExporting(true)
      setShowMenu(false)
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
      setShowMenu(false)
      const filename = `issue_register_${register?.register_reference || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`
      exportIssuesToExcel(issues, filename)
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
      setShowMenu(false)
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
      setShowMenu(false)
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
    setShowMenu(false)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
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
    setShowMenu(false)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
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

  const handleExportWord = async () => {
    if (selectedColumns.length === 0) return
    setExporting(true)
    try {
      await exportListToWord(selectedColumns, listRows, baseFilename)
      setFieldModal(null)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPPT = () => {
    if (selectedColumns.length === 0) return
    setExporting(true)
    try {
      exportListToPPT(selectedColumns, listRows, baseFilename)
      setFieldModal(null)
    } finally {
      setExporting(false)
    }
  }

  if (!register) return null

  const itemClass =
    'w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50'

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          disabled={exporting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-haspopup="true"
          aria-expanded={showMenu}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export'}
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Register report
            </p>
            <button type="button" onClick={handleExportCSV} disabled={!hasIssues || exporting} className={itemClass}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={!hasIssues || exporting} className={itemClass}>
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel
            </button>
            <button type="button" onClick={handleExportPDF} disabled={!hasIssues || exporting} className={itemClass}>
              <FileText className="h-4 w-4 text-red-500" />
              PDF
            </button>
            <button type="button" onClick={handlePrint} disabled={!hasIssues || exporting} className={itemClass}>
              <Printer className="h-4 w-4" />
              Print
            </button>

            {columns.length > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  List export
                </p>
                {!hasListData && (
                  <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No issues to export yet.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => {
                    const { columns: c, rows: r } = resolveExport(columns, listRows)
                    exportToExcel(c, r, baseFilename)
                    setShowMenu(false)
                  }}
                  className={itemClass}
                >
                  <Table2 className="h-4 w-4 text-green-600" />
                  Excel (all fields)
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => openFieldModal('word')}
                  className={itemClass}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Word (choose fields)
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => openFieldModal('ppt')}
                  className={itemClass}
                >
                  <Presentation className="h-4 w-4 text-amber-600" />
                  PowerPoint (choose fields)
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => {
                    const { columns: c, rows: r } = resolveExport(columns, listRows)
                    exportListToCSV(c, r, baseFilename)
                    setShowMenu(false)
                  }}
                  className={itemClass}
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  CSV (list columns)
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => {
                    const { columns: c, rows: r } = resolveExport(columns, listRows)
                    exportListToXML(c, r, baseFilename)
                    setShowMenu(false)
                  }}
                  className={itemClass}
                >
                  <Code className="h-4 w-4 text-orange-600" />
                  XML
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => {
                    const { columns: c, rows: r } = resolveExport(columns, listRows)
                    exportListToJSON(c, r, baseFilename)
                    setShowMenu(false)
                  }}
                  className={itemClass}
                >
                  <Braces className="h-4 w-4 text-yellow-600" />
                  JSON
                </button>
                <button
                  type="button"
                  disabled={!hasListData}
                  onClick={() => {
                    const { columns: c, rows: r } = resolveExport(columns, listRows)
                    exportListToPrint(c, r, baseFilename)
                    setShowMenu(false)
                  }}
                  className={itemClass}
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  Print list
                </button>
              </>
            )}

            {selectedIssue && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button type="button" onClick={handleExportIssuePDF} disabled={exporting} className={itemClass}>
                  <FileText className="h-4 w-4 text-purple-500" />
                  Selected issue PDF
                </button>
                <button type="button" onClick={handlePrintIssue} disabled={exporting} className={itemClass}>
                  <Printer className="h-4 w-4 text-indigo-500" />
                  Print selected issue
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {fieldModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !exporting && setFieldModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Choose fields to export ({fieldModal === 'word' ? 'Word' : 'PowerPoint'})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select up to {MAX_LIST_EXPORT_FIELDS} fields (default {DEFAULT_LIST_EXPORT_FIELDS}).
              </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <ul className="space-y-2">
                {allKeys.map((key) => {
                  const col = columns.find((c) => c.key === key)
                  const label = col?.label || key
                  const checked = selectedKeys.includes(key)
                  const disabledCheck = !checked && selectedKeys.length >= MAX_LIST_EXPORT_FIELDS
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`issue-export-field-${key}`}
                        checked={checked}
                        disabled={disabledCheck}
                        onChange={() => toggleKey(key)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`issue-export-field-${key}`}
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                      >
                        {label}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFieldModal(null)}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={fieldModal === 'word' ? handleExportWord : handleExportPPT}
                disabled={exporting || selectedColumns.length === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : `Export to ${fieldModal === 'word' ? 'Word' : 'PowerPoint'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
