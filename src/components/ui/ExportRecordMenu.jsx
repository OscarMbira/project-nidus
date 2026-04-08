/**
 * ExportRecordMenu — Single Export dropdown for record view (view/read/see mode).
 * Excel: all fields. Word / PowerPoint: modal to choose which fields (no max; Select all available).
 * Theme-aware (dark/light). The 10-field limit applies only to list/table export, not record export.
 */

import { useState, useMemo } from 'react'
import { Download, ChevronDown, Presentation, FileText, Table2, FileSpreadsheet, Code, Braces, Printer } from 'lucide-react'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint
} from '../../utils/exportUtils'

/**
 * Flatten sections to a list of { key, label } for the field selector.
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @returns {Array<{key: string, label: string}>}
 */
function flattenSectionFields(sections) {
  if (!Array.isArray(sections)) return []
  return sections.flatMap((s) => (s.fields || []).map((f) => ({ key: f.key, label: f.label || f.key })))
}

/**
 * Filter sections to only include fields whose keys are in selectedKeys.
 * @param {Array<{title: string, fields: Array<{key: string, label: string}>}>} sections
 * @param {string[]} selectedKeys
 * @returns {Array<{title: string, fields: Array<{key: string, label: string}>}>}
 */
function filterSectionsByKeys(sections, selectedKeys) {
  if (!Array.isArray(sections) || !selectedKeys?.length) return []
  return sections
    .map((s) => ({
      title: s.title,
      fields: (s.fields || []).filter((f) => selectedKeys.includes(f.key))
    }))
    .filter((s) => s.fields.length > 0)
}

export default function ExportRecordMenu({
  sections = [],
  record,
  baseFilename = 'Record',
  disabled = false
}) {
  const [open, setOpen] = useState(false)
  const [fieldModal, setFieldModal] = useState(null) // 'word' | 'ppt' | null
  const flatFields = useMemo(() => flattenSectionFields(sections), [sections])
  const allKeys = useMemo(() => flatFields.map((f) => f.key), [flatFields])
  const [selectedKeys, setSelectedKeys] = useState(() => allKeys)
  const [exporting, setExporting] = useState(false)

  const selectedSections = useMemo(
    () => filterSectionsByKeys(sections, selectedKeys),
    [sections, selectedKeys]
  )

  const toggleKey = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const selectAll = () => setSelectedKeys([...allKeys])
  const deselectAll = () => setSelectedKeys([])

  const openFieldModal = (type) => {
    setSelectedKeys((prev) => (prev.length > 0 ? prev : [...allKeys]))
    setFieldModal(type)
  }

  const handleExportWord = async () => {
    if (selectedSections.length === 0 || !record) return
    setExporting(true)
    try {
      await exportRecordToWord(selectedSections, record, baseFilename)
      setFieldModal(null)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPPT = () => {
    if (selectedSections.length === 0 || !record) return
    setExporting(true)
    try {
      exportRecordToPPT(selectedSections, record, baseFilename)
      setFieldModal(null)
    } finally {
      setExporting(false)
    }
  }

  const btnBase =
    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled || !record}
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
                onClick={() => {
                  exportRecordToExcel(sections, record, baseFilename)
                  setOpen(false)
                }}
                disabled={!record}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Table2 className="w-4 h-4 text-green-600" /> Excel (all fields)
              </button>
              <button
                type="button"
                onClick={() => {
                  openFieldModal('word')
                  setOpen(false)
                }}
                disabled={!record || flatFields.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-blue-600" /> Word (choose fields)
              </button>
              <button
                type="button"
                onClick={() => {
                  openFieldModal('ppt')
                  setOpen(false)
                }}
                disabled={!record || flatFields.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Presentation className="w-4 h-4 text-amber-600" /> PowerPoint (choose fields)
              </button>
              <button
                type="button"
                onClick={() => { exportRecordToCSV(sections, record, baseFilename); setOpen(false) }}
                disabled={!record}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV
              </button>
              <button
                type="button"
                onClick={() => { exportRecordToXML(sections, record, baseFilename); setOpen(false) }}
                disabled={!record}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Code className="w-4 h-4 text-orange-600" /> XML
              </button>
              <button
                type="button"
                onClick={() => { exportRecordToJSON(sections, record, baseFilename); setOpen(false) }}
                disabled={!record}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Braces className="w-4 h-4 text-yellow-600" /> JSON
              </button>
              <button
                type="button"
                onClick={() => { exportRecordToPrint(sections, record, baseFilename); setOpen(false) }}
                disabled={!record}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Printer className="w-4 h-4 text-slate-600" /> Print
              </button>
            </div>
          </>
        )}
      </div>

      {/* Field selector modal for Word / PowerPoint — record view: no max, Select all available */}
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
                Select the fields to include. Use Select all to include every field.
              </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-4 mb-3">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Deselect all
                </button>
              </div>
              <ul className="space-y-2">
                {flatFields.map(({ key, label }) => (
                  <li key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`record-field-${key}`}
                      checked={selectedKeys.includes(key)}
                      onChange={() => toggleKey(key)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`record-field-${key}`}
                      className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    >
                      {label}
                    </label>
                  </li>
                ))}
              </ul>
              {selectedKeys.length > 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {selectedKeys.length} field{selectedKeys.length !== 1 ? 's' : ''} selected
                </p>
              )}
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
                disabled={exporting || selectedSections.length === 0}
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
