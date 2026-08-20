import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@nidus/ui/Modal'
import Button from '@nidus/ui/Button'
import { parseFormExcelFile } from '../../services/formExcelFileParseService'
import {
  analyzeFormExcelMatrix,
  mergeExcelColumnsIntoSections,
  FORM_EXCEL_MAX_DATA_ROWS,
} from '@nidus/shared/utils/formExcelImportUtils.js'

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'select', label: 'Select' },
  { value: 'attachment', label: 'Attachment (image/file)' },
]

/**
 * Import Excel/CSV column structure into Form Template Builder (v857 Phase 2).
 */
export default function FormExcelSchemaImportModal({ isOpen, onClose, sections, onApply }) {
  const [step, setStep] = useState('upload') // upload | map
  const [busy, setBusy] = useState(false)
  const [sheetNames, setSheetNames] = useState([])
  const [sheets, setSheets] = useState([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [columns, setColumns] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [analysisMeta, setAnalysisMeta] = useState(null)

  const reset = () => {
    setStep('upload')
    setBusy(false)
    setSheetNames([])
    setSheets([])
    setSheetIndex(0)
    setColumns([])
    setCategoryOptions([])
    setAnalysisMeta(null)
  }

  const handleClose = () => {
    if (busy) return
    reset()
    onClose?.()
  }

  const runAnalyze = (matrix) => {
    const analyzed = analyzeFormExcelMatrix(matrix)
    if (analyzed.error) {
      toast.error(analyzed.error)
      return false
    }
    setColumns(analyzed.columns)
    setCategoryOptions(analyzed.categoryOptions)
    setAnalysisMeta({
      totalDataRows: analyzed.totalDataRows,
      truncated: analyzed.truncated,
      categoryOptions: analyzed.categoryOptions,
    })
    setStep('map')
    return true
  }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const parsed = await parseFormExcelFile(file)
      const list = parsed.sheets || []
      if (!list.length) throw new Error('No sheets found in file')
      setSheets(list)
      setSheetNames(list.map((s) => s.name))
      setSheetIndex(0)
      runAnalyze(list[0].matrix)
    } catch (e) {
      toast.error(e.message || 'Failed to read file')
    } finally {
      setBusy(false)
    }
  }

  const handleSheetChange = (idx) => {
    const i = Number(idx)
    setSheetIndex(i)
    const sheet = sheets[i]
    if (sheet) runAnalyze(sheet.matrix)
  }

  const updateColumn = (colIndex, patch) => {
    setColumns((prev) => prev.map((c) => (c.colIndex === colIndex ? { ...c, ...patch } : c)))
  }

  const handleApply = () => {
    const { sections: next, added, matched, skipped } = mergeExcelColumnsIntoSections(
      sections,
      columns,
      categoryOptions,
    )
    onApply?.(next, { added, matched, skipped })
    toast.success(`Merged fields: ${added} added, ${matched} matched, ${skipped} skipped`)
    reset()
    onClose?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import fields from Excel"
      size="lg"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {step === 'map' && (
            <Button type="button" onClick={handleApply} disabled={busy || !columns.length}>
              Apply to field catalog
            </Button>
          )}
        </>
      )}
    >
      {step === 'upload' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Upload an .xlsx or .csv. Column headers become form fields. Banner rows (e.g. APPLICATION
            SERVERS) become a Category select field. Types are inferred from sample cells (Text when
            unclear). Max {FORM_EXCEL_MAX_DATA_ROWS} data rows are scanned for inference.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white dark:text-gray-200"
          />
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          {sheetNames.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Sheet</label>
              <select
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                value={sheetIndex}
                onChange={(e) => handleSheetChange(e.target.value)}
              >
                {sheetNames.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {analysisMeta?.categoryOptions?.length > 0 && (
            <div className="rounded border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-800 dark:bg-violet-950/40">
              <p className="font-medium text-violet-900 dark:text-violet-100">Category field (Select)</p>
              <p className="mt-1 text-xs text-violet-800 dark:text-violet-200">
                Options from banner rows: {analysisMeta.categoryOptions.join(', ')}
              </p>
            </div>
          )}

          {analysisMeta?.truncated && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Sheet has {analysisMeta.totalDataRows} data rows; only the first {FORM_EXCEL_MAX_DATA_ROWS} were used for type inference.
            </p>
          )}

          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-2">Skip</th>
                  <th className="px-2 py-2">Label</th>
                  <th className="px-2 py-2">Key</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Sample</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr key={col.colIndex} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={Boolean(col.skip)}
                        onChange={(e) => updateColumn(col.colIndex, { skip: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full min-w-[8rem] rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        value={col.label}
                        disabled={col.skip}
                        onChange={(e) => updateColumn(col.colIndex, { label: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full min-w-[8rem] rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        value={col.key}
                        disabled={col.skip}
                        onChange={(e) => updateColumn(col.colIndex, { key: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        value={col.type}
                        disabled={col.skip}
                        onChange={(e) => updateColumn(col.colIndex, { type: e.target.value })}
                      >
                        {FIELD_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-1.5 text-gray-500 dark:text-gray-400">
                      {(col.samples || []).slice(0, 2).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => setStep('upload')}
          >
            ← Choose a different file
          </button>
        </div>
      )}
    </Modal>
  )
}
