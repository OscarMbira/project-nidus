/**
 * FormTemplateExportMenu — Plain Template / Sample export for PMO form builders.
 * Merges org Default Content (guidance + sample) over schema help/sample.
 * Theme-aware; formats match Admin form-template export (without Real submission).
 */

import { useState } from 'react'
import {
  Download,
  ChevronDown,
  ChevronLeft,
  FileText,
  Presentation,
  Table2,
  FileSpreadsheet,
  Code,
  Braces,
  Printer,
  FileDown,
} from 'lucide-react'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
  exportRecordToPDF,
} from '@nidus/shared/utils/exportUtils'
import {
  buildExportSections,
  buildBlankRecord,
  buildSampleRecord,
  mergeSchemaGuidanceForExport,
  PLAIN_TEMPLATE_BLANK,
  buildFormTemplateExportFilename,
} from '@nidus/shared/utils/formTemplateExportUtils'

const DATA_MODES = [
  { id: 'plain', label: 'Plain Template', description: 'Blank fillable form with guidance + examples' },
  { id: 'sample', label: 'Completed (Sample data)', description: 'Uses Guidance + Sample defaults' },
]

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileDown, iconClass: 'text-red-600' },
  { id: 'word', label: 'Word', icon: FileText, iconClass: 'text-blue-600' },
  { id: 'excel', label: 'Excel', icon: Table2, iconClass: 'text-green-600' },
  { id: 'ppt', label: 'PowerPoint', icon: Presentation, iconClass: 'text-amber-600' },
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet, iconClass: 'text-emerald-600' },
  { id: 'xml', label: 'XML', icon: Code, iconClass: 'text-orange-600' },
  { id: 'json', label: 'JSON', icon: Braces, iconClass: 'text-yellow-600' },
  { id: 'print', label: 'Print', icon: Printer, iconClass: 'text-slate-600' },
]

async function runExport(format, sections, record, baseFilename, branding, blankPlaceholder) {
  switch (format) {
    case 'pdf':
      await exportRecordToPDF(sections, record, baseFilename, branding, blankPlaceholder)
      break
    case 'word':
      await exportRecordToWord(sections, record, baseFilename, branding, blankPlaceholder)
      break
    case 'excel':
      await exportRecordToExcel(sections, record, baseFilename, branding, blankPlaceholder)
      break
    case 'ppt':
      exportRecordToPPT(sections, record, baseFilename, branding, blankPlaceholder)
      break
    case 'csv':
      exportRecordToCSV(sections, record, baseFilename, blankPlaceholder)
      break
    case 'xml':
      exportRecordToXML(sections, record, baseFilename, blankPlaceholder)
      break
    case 'json':
      exportRecordToJSON(sections, record, baseFilename, blankPlaceholder)
      break
    case 'print':
      exportRecordToPrint(sections, record, baseFilename, branding, blankPlaceholder)
      break
    default:
      break
  }
}

/**
 * @param {object} props
 * @param {object} props.schema - form schema `{ sections: [...] }`
 * @param {import('@nidus/shared/utils/formTemplateFieldDefaults').FieldDefaultRow[]} [props.defaultRows]
 * @param {string} [props.templateName]
 * @param {string} [props.templateCode]
 * @param {object|null} [props.branding]
 * @param {boolean} [props.disabled]
 */
export default function FormTemplateExportMenu({
  schema,
  defaultRows = [],
  templateName = 'Form Template',
  templateCode = '',
  branding = null,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('mode')
  const [mode, setMode] = useState(null)
  const [exporting, setExporting] = useState(false)

  const mergedSchema = mergeSchemaGuidanceForExport(schema, defaultRows)
  const sectionsForMode = (exportMode) =>
    buildExportSections(schema, defaultRows, { includeExamples: exportMode === 'plain' })
  const baseFilename = buildFormTemplateExportFilename({ templateCode, templateName })
  const canExport = buildExportSections(schema, defaultRows).length > 0

  const resetMenu = () => {
    setOpen(false)
    setStep('mode')
    setMode(null)
  }

  const chooseMode = (nextMode) => {
    setMode(nextMode)
    setStep('format')
  }

  const handleFormat = async (format) => {
    if (!canExport || exporting || !mode) return
    setExporting(true)
    try {
      const sections = sectionsForMode(mode)
      const record = mode === 'plain'
        ? buildBlankRecord(mergedSchema)
        : buildSampleRecord(mergedSchema)
      const blank = mode === 'plain' ? PLAIN_TEMPLATE_BLANK : '—'
      await runExport(format, sections, record, baseFilename, branding, blank)
      resetMenu()
    } finally {
      setExporting(false)
    }
  }

  const btnBase =
    'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          if (open) resetMenu()
          else {
            setOpen(true)
            setStep('mode')
            setMode(null)
          }
        }}
        disabled={disabled || !canExport}
        className={btnBase}
        aria-haspopup="true"
        aria-expanded={open}
        title={!canExport ? 'Add sections and fields before exporting' : 'Export form template'}
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={resetMenu} aria-hidden="true" />
          <div className="absolute right-0 mt-1 py-1 min-w-[260px] max-w-[320px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-20">
            {step === 'mode' && (
              <>
                <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  Choose data mode
                </p>
                {DATA_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => chooseMode(m.id)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="block text-sm text-gray-800 dark:text-gray-100">{m.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{m.description}</span>
                  </button>
                ))}
              </>
            )}

            {step === 'format' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('mode')}
                  className="w-full flex items-center gap-1 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {mode === 'plain' ? 'Plain Template' : 'Completed (Sample)'}
                </button>
                {FORMATS.map(({ id, label, icon: Icon, iconClass }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={exporting}
                    onClick={() => handleFormat(id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                    {exporting ? 'Exporting…' : label}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
