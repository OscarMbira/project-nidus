/**
 * RFPBulkImport - 3-stage bulk import flow
 * Stage 1: Template download + file upload
 * Stage 2: Validation + column mapping
 * Stage 3: Import execution + results
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import * as defaultBulkImportService from '../../services/rfpBulkImportService'
import RFPColumnMapper from './RFPColumnMapper'

const MAX_FILE_SIZE_MB = 10
const MAX_ROWS = 5000
const IMPORT_TIMEOUT_MS = 120000 // 2 min – unstick button if DB/server hangs

export default function RFPBulkImport({ rfpId, onImportComplete, bulkImportService = defaultBulkImportService }) {
  const [stage, setStage] = useState(1)
  const [file, setFile] = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [mapping, setMapping] = useState({})
  const [validation, setValidation] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const {
    parseRFPCSV,
    parseRFPExcel,
    autoDetectColumnMapping,
    validateAllRows,
    mapRowToDBFormat,
    bulkImportLineItems,
    downloadRFPImportTemplate,
    downloadRFPSampleFile,
  } = bulkImportService

  const handleDownloadTemplate = useCallback(() => {
    downloadRFPImportTemplate()
  }, [downloadRFPImportTemplate])

  const handleDownloadSample = useCallback(() => {
    downloadRFPSampleFile()
  }, [downloadRFPSampleFile])

  const handleFileSelect = useCallback(async (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setError(null)
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`)
      return
    }
    if (!selected.name.match(/\.(csv|xls|xlsx)$/i)) {
      setError('Please select a CSV or Excel file (CSV, XLS, XLSX)')
      return
    }

    setParsing(true)
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(selected.name)
      const result = isExcel
        ? parseRFPExcel(await selected.arrayBuffer())
        : parseRFPCSV(await selected.text())

      if (result.totalRows > MAX_ROWS) {
        setError(`File has ${result.totalRows} rows. Maximum is ${MAX_ROWS}.`)
        return
      }

      const { mapping: detected } = autoDetectColumnMapping(result.headers)
      setParseResult(result)
      setMapping(detected)
      setFile(selected)
      setStage(2)
    } catch (err) {
      setError(err?.message || 'Failed to parse file')
    } finally {
      setParsing(false)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [parseRFPCSV, parseRFPExcel, autoDetectColumnMapping])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFileSelect({ target: { files: [f] } })
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => e.preventDefault(), [])

  const handleValidateAndProceed = useCallback(() => {
    if (!parseResult || !mapping.item_number || !mapping.description) {
      setError('S/No and Description columns must be mapped')
      return
    }

    const mappedRows = parseResult.rows.map((row) => mapRowToDBFormat(row, mapping))
    const valid = validateAllRows(mappedRows)
    setValidation(valid)
    setStage(3)
    setError(null)
  }, [parseResult, mapping, mapRowToDBFormat, validateAllRows])

  const handleImport = useCallback(async () => {
    if (!validation || validation.validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    setImporting(true)
    setError(null)
    setImportProgress({ current: 0, total: validation.validRows.length })

    try {
      const toImport = validation.validRows.map(({ _rowNumber, _warnings, ...r }) => r)
      const importPromise = bulkImportLineItems(rfpId, toImport, {
        onProgress: (current, total) => setImportProgress({ current, total }),
      })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Import timed out. Check your connection and that the database migration (SQL/v327_rfp_line_items_additional_columns.sql) has been run, then try again.')), IMPORT_TIMEOUT_MS)
      )
      const result = await Promise.race([importPromise, timeoutPromise])

      setImportResult(result)
      if (result?.success && onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      setError(err?.message || 'Import failed')
    } finally {
      setImporting(false)
      setImportProgress({ current: 0, total: 0 })
    }
  }, [rfpId, validation, bulkImportLineItems, onImportComplete])

  const handleReset = useCallback(() => {
    setStage(1)
    setFile(null)
    setParseResult(null)
    setMapping({})
    setValidation(null)
    setImportResult(null)
    setError(null)
    setImportProgress({ current: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-6">
      {/* Stage 1: Upload */}
      {stage === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload CSV/Excel File</h2>
          <div className="flex gap-4 mb-4">
            <button onClick={handleDownloadTemplate} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4 mr-2" /> Download Template
            </button>
            <button onClick={handleDownloadSample} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4 mr-2" /> Download Sample
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">CSV, XLS, XLSX (max {MAX_FILE_SIZE_MB}MB, max {MAX_ROWS} rows)</p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              parsing
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 pointer-events-none'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
            }`}
            onClick={() => !parsing && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleFileSelect} className="hidden" disabled={parsing} />
            {parsing ? (
              <>
                <div className="w-12 h-12 mx-auto mb-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-400">Parsing file…</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Drop file here or click to select</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stage 2: Validate & Map */}
      {stage === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Column Mapping</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">File: {file?.name} · {parseResult?.totalRows} rows</p>
            <RFPColumnMapper headers={parseResult?.headers || []} mapping={mapping} onChange={setMapping} />
            <div className="mt-6 flex gap-3">
              <button onClick={handleValidateAndProceed} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Validate & Preview
              </button>
              <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Import */}
      {stage === 3 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Results</h2>
            {validation && (
              <div className="mb-4 flex flex-wrap gap-4">
                <span className="flex items-center text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4 mr-1" /> Valid: {validation.summary.valid}</span>
                {validation.summary.invalid > 0 && <span className="flex items-center text-red-600 dark:text-red-400"><XCircle className="w-4 h-4 mr-1" /> Invalid: {validation.summary.invalid}</span>}
                {validation.allWarnings.length > 0 && <span className="flex items-center text-amber-600 dark:text-amber-400"><AlertCircle className="w-4 h-4 mr-1" /> Warnings: {validation.allWarnings.length}</span>}
              </div>
            )}

            {!importResult ? (
              <>
                {validation.validRows.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ready to import {validation.validRows.length} rows.</p>
                    {importing && importProgress.total > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Importing… {importProgress.current} / {importProgress.total}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {importing ? 'Importing...' : 'Import'}
                      </button>
                      <button onClick={() => setStage(2)} disabled={importing} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Back</button>
                      <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400">No valid rows to import. Fix errors and try again.</p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className={importResult.success ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                  {importResult.success
                    ? `Successfully imported ${importResult.results.successful} line items.`
                    : `Imported ${importResult.results.successful}, failed ${importResult.results.failed}.`}
                </p>
                {importResult.results.errors?.length > 0 && (
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc pl-5">
                    {importResult.results.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>Row {e.row}: {e.error}</li>
                    ))}
                    {importResult.results.errors.length > 5 && <li>...and {importResult.results.errors.length - 5} more</li>}
                  </ul>
                )}
                <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Import Another</button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
