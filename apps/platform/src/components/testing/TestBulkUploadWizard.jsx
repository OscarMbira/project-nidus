import { useState, useMemo } from 'react'
import ColumnMappingStep from '@nidus/ui/ai/ColumnMappingStep.jsx'
import { dictionaryFromColumns, needsMapping } from '@nidus/shared/utils/importMapping'
import { parseImportFile, validateImportRows, IMPORT_FIELD_LABELS, REQUIRED_FIELDS, VALID_VALUES } from '../../services/testImportService'
import { batchCreateTestCases } from '../../services/testCaseService'
import TestCaseImportTemplate from './TestCaseImportTemplate'

const STEPS = ['file', 'map', 'preview', 'result']

// v1272 Phase 2: template fields for the Import Mapper (the same definitions the template download uses).
const TEST_IMPORT_COLUMNS = Object.entries(IMPORT_FIELD_LABELS).map(([key, label]) => ({
  key,
  label: label.replace(/\s*\*$/, '').replace(/\s*\(.*\)$/, ''),
  required: REQUIRED_FIELDS.includes(key),
  type: key === 'estimated_duration_minutes' ? 'Number' : VALID_VALUES[key] ? 'Enum' : 'Text',
  allowed: VALID_VALUES[key] || [],
  description: label,
}))
const TEST_DICTIONARY = dictionaryFromColumns(TEST_IMPORT_COLUMNS)

export default function TestBulkUploadWizard({
  projectId,
  suiteNameToId = {},
  validateOptions = {},
  batchCreateFn = batchCreateTestCases,
}) {
  const [step, setStep] = useState(STEPS[0])
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [validation, setValidation] = useState(null)
  const [batchResult, setBatchResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mappingInput, setMappingInput] = useState(null)

  const suiteMap = useMemo(() => suiteNameToId, [suiteNameToId])

  const toPreview = (rows) => {
    setParsedRows(rows || [])
    setValidation(validateImportRows(rows || [], projectId, suiteMap, validateOptions))
    setStep('preview')
  }

  const onPickFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParseErrors([])
    setBatchResult(null)
    try {
      const { rows, errors } = await parseImportFile(f)
      if (errors?.length) setParseErrors(errors)
      const headers = [...new Set((rows || []).flatMap((r) => Object.keys(r || {})))]
      if (rows?.length && needsMapping(headers, TEST_DICTIONARY)) {
        setMappingInput({ headers, rows })
        setStep('map')
        return
      }
      toPreview(rows)
    } catch (err) {
      alert(err?.message || 'Failed to parse file')
    }
  }

  const runImport = async () => {
    if (!validation?.validRows?.length) return
    setBusy(true)
    try {
      const res = await batchCreateFn(validation.validRows)
      setBatchResult(res)
      setStep('result')
    } catch (e) {
      alert(e?.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-6 space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-500 font-semibold">Bulk import</p>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Test cases</h2>
        </div>
        <TestCaseImportTemplate />
      </div>

      <div className="flex gap-2 text-xs">
        {STEPS.map((s) => (
          <span
            key={s}
            className={`px-2 py-1 rounded ${step === s ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {step === 'file' && (
        <div>
          <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-600">
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.json,.xml" onChange={onPickFile} />
            <p className="text-gray-700 dark:text-gray-300">Drop or click to select CSV, Excel, JSON, or XML</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Columns from another test tool? You can match them to the template next.</p>
          </label>
        </div>
      )}

      {step === 'map' && mappingInput && (
        <ColumnMappingStep
          target="test_cases"
          templateLabel="Test cases"
          columns={TEST_IMPORT_COLUMNS}
          headers={mappingInput.headers}
          rows={mappingInput.rows}
          onCancel={() => { setMappingInput(null); setStep('file') }}
          onConfirm={({ rows }) => { setMappingInput(null); toPreview(rows) }}
        />
      )}

      {step === 'preview' && validation && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Valid: {validation.validRows.length} · Invalid: {validation.invalidRows.length}
          </p>
          <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="p-2 text-gray-600 dark:text-gray-400">Row</th>
                  <th className="p-2 text-gray-600 dark:text-gray-400">Title</th>
                  <th className="p-2 text-gray-600 dark:text-gray-400">Errors</th>
                </tr>
              </thead>
              <tbody>
                {validation.invalidRows.slice(0, 50).map((r) => (
                  <tr key={r.rowIndex} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="p-2 text-gray-500">{r.rowIndex}</td>
                    <td className="p-2 text-gray-800 dark:text-gray-200">{(r.raw?.title || '').slice(0, 80)}</td>
                    <td className="p-2 text-red-600 dark:text-red-300">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('file')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || validation.validRows.length === 0}
              onClick={runImport}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {busy ? 'Importing…' : `Import ${validation.validRows.length} rows`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && batchResult && (
        <div className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
          <p>Created: {batchResult.created}</p>
          <p>Failed: {batchResult.failed}</p>
          {batchResult.errors?.length > 0 && (
            <pre className="text-xs text-red-700 dark:text-red-300 bg-gray-50 dark:bg-gray-950 p-3 rounded-lg overflow-auto max-h-40">
              {JSON.stringify(batchResult.errors, null, 2)}
            </pre>
          )}
          <button
            type="button"
            onClick={() => {
              setStep('file')
              setFile(null)
              setParsedRows([])
              setValidation(null)
              setBatchResult(null)
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
