/**
 * ExportRecordButtons — Single Export dropdown for record view pages.
 * Options: Excel, Word, PowerPoint, CSV, XML, JSON, Print.
 *
 * Declarative API (preferred): pass sections + record + baseFilename — wires all formats via ExportRecordMenu.
 * Callback API (legacy): pass onExportExcel, onExportWord, etc.
 */

import { useState } from 'react'
import { Download, ChevronDown, Presentation, FileText, Table2, FileSpreadsheet, Code, Braces, Printer } from 'lucide-react'
import ExportRecordMenu from './ExportRecordMenu'

export default function ExportRecordButtons({
  sections,
  record,
  baseFilename,
  title,
  onExportPPT,
  onExportWord,
  onExportExcel,
  onExportCSV,
  onExportXML,
  onExportJSON,
  onExportPrint,
  disabled = false
}) {
  if (sections && record) {
    return (
      <ExportRecordMenu
        sections={sections}
        record={record}
        baseFilename={baseFilename || title || 'Record'}
        disabled={disabled}
      />
    )
  }

  const [open, setOpen] = useState(false)

  const btnBase = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={btnBase}
        aria-haspopup="true"
        aria-expanded={open}
        title="Export"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-1 py-1 min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-20">
            <button
              type="button"
              onClick={() => { onExportExcel?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Table2 className="w-4 h-4 text-green-600" /> Excel (all fields)
            </button>
            <button
              type="button"
              onClick={() => { onExportWord?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Word (choose fields)
            </button>
            <button
              type="button"
              onClick={() => { onExportPPT?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Presentation className="w-4 h-4 text-amber-600" /> PowerPoint (choose fields)
            </button>
            <button
              type="button"
              onClick={() => { onExportCSV?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV
            </button>
            <button
              type="button"
              onClick={() => { onExportXML?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Code className="w-4 h-4 text-orange-600" /> XML
            </button>
            <button
              type="button"
              onClick={() => { onExportJSON?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Braces className="w-4 h-4 text-yellow-600" /> JSON
            </button>
            <button
              type="button"
              onClick={() => { onExportPrint?.(); setOpen(false) }}
              disabled={disabled}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Print
            </button>
          </div>
        </>
      )}
    </div>
  )
}
