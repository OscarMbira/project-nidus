/**
 * FormTranslationBulkImport - 2-stage bulk translation import flow
 * Stage 1: Choose target language, download template (pre-filled with any
 *          existing translations), upload the filled-in sheet
 * Stage 2: Validation summary + import execution + results
 * Mirrors apps/platform/src/components/rfp/RFPBulkImport.jsx's stage shape.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { getTranslationTargetLanguages } from '@nidus/shared/utils/formTranslations'
import * as defaultBulkImportService from '../../services/formTranslationBulkImportService'
import { getFieldTranslations } from '../../services/formEngineService'

const MAX_FILE_SIZE_MB = 10

export default function FormTranslationBulkImport({
  template,
  schema,
  activeLanguages = [],
  mode = 'platform',
  onImportComplete,
  bulkImportService = defaultBulkImportService,
}) {
  const targetLanguages = getTranslationTargetLanguages(activeLanguages)
  const [languageCode, setLanguageCode] = useState('')
  const [stage, setStage] = useState(1)
  const [file, setFile] = useState(null)
  const [validation, setValidation] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const {
    parseTranslationExcel,
    validateTranslationRows,
    buildTranslationPayloadRows,
    downloadTranslationTemplate,
    bulkImportFieldTranslations,
  } = bulkImportService

  useEffect(() => {
    if (!targetLanguages.length) {
      setLanguageCode('')
      return
    }
    setLanguageCode((current) => (
      current && targetLanguages.some((lang) => lang.code === current)
        ? current
        : targetLanguages[0].code
    ))
  }, [targetLanguages])

  const handleDownloadTemplate = useCallback(async () => {
    if (!languageCode) {
      setError('Choose a target language first')
      return
    }
    setDownloading(true)
    setError(null)
    try {
      const existing = await getFieldTranslations(template.id, mode)
      downloadTranslationTemplate(template, schema, existing.success ? existing.data : [], languageCode)
    } catch (err) {
      setError(err?.message || 'Failed to build template')
    } finally {
      setDownloading(false)
    }
  }, [template, schema, languageCode, mode, downloadTranslationTemplate])

  const handleFileSelect = useCallback(async (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setError(null)
    if (!languageCode) {
      setError('Choose a target language first')
      return
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`)
      return
    }
    if (!selected.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please select an Excel file (XLS, XLSX) — use the downloaded template')
      return
    }

    setParsing(true)
    try {
      const rows = parseTranslationExcel(await selected.arrayBuffer())
      const result = validateTranslationRows(rows)
      setValidation(result)
      setFile(selected)
      setStage(2)
    } catch (err) {
      setError(err?.message || 'Failed to parse file')
    } finally {
      setParsing(false)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [languageCode, parseTranslationExcel, validateTranslationRows])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFileSelect({ target: { files: [f] } })
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => e.preventDefault(), [])

  const handleImport = useCallback(async () => {
    if (!validation || validation.validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    setImporting(true)
    setError(null)
    try {
      const payloadRows = buildTranslationPayloadRows(validation.validRows)
      const result = await bulkImportFieldTranslations(template.id, languageCode, payloadRows, mode)
      setImportResult(result)
      if (result?.success && onImportComplete) onImportComplete()
    } catch (err) {
      setError(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [template, languageCode, mode, validation, buildTranslationPayloadRows, bulkImportFieldTranslations, onImportComplete])

  const handleReset = useCallback(() => {
    setStage(1)
    setFile(null)
    setValidation(null)
    setImportResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-6">
      {/* Stage 1: Choose language + upload */}
      {stage === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Translate field labels</h2>

          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target language</label>
          <select
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="w-full max-w-xs mb-4 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a language…</option>
            {targetLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.native_name || lang.name}</option>
            ))}
          </select>
          {targetLanguages.length === 0 && (
            <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
              English is the source language for field labels. Add another active language in System Admin before bulk-translating.
            </p>
          )}

          <div className="flex gap-4 mb-4">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading || !languageCode}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> {downloading ? 'Preparing…' : 'Download Template'}
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Field labels are authored in English. Choose a target language, download the template, fill in the &quot;Translated Text&quot; column, then upload. XLS, XLSX (max {MAX_FILE_SIZE_MB}MB)
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              !languageCode
                ? 'border-gray-200 dark:border-gray-800 opacity-50 pointer-events-none'
                : parsing
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 pointer-events-none cursor-pointer'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 cursor-pointer'
            }`}
            onClick={() => languageCode && !parsing && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".xls,.xlsx" onChange={handleFileSelect} className="hidden" disabled={parsing || !languageCode} />
            {parsing ? (
              <>
                <div className="w-12 h-12 mx-auto mb-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-400">Parsing file…</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {languageCode ? 'Drop file here or click to select' : 'Choose a language first'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stage 2: Validate & Import */}
      {stage === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Results</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">File: {file?.name}</p>

            {validation && (
              <div className="mb-4 flex flex-wrap gap-4">
                <span className="flex items-center text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4 mr-1" /> Valid: {validation.summary.valid}</span>
                {validation.summary.invalid > 0 && <span className="flex items-center text-red-600 dark:text-red-400"><XCircle className="w-4 h-4 mr-1" /> Invalid: {validation.summary.invalid}</span>}
                {validation.allWarnings.length > 0 && <span className="flex items-center text-amber-600 dark:text-amber-400"><AlertCircle className="w-4 h-4 mr-1" /> Warnings: {validation.allWarnings.length}</span>}
              </div>
            )}

            {validation?.allErrors?.length > 0 && (
              <ul className="mb-4 text-sm text-red-600 dark:text-red-400 list-disc pl-5">
                {validation.allErrors.slice(0, 5).map((msg, i) => <li key={i}>{msg}</li>)}
                {validation.allErrors.length > 5 && <li>...and {validation.allErrors.length - 5} more</li>}
              </ul>
            )}

            {!importResult ? (
              validation?.validRows.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ready to save translations from {validation.validRows.length} row(s).</p>
                  <div className="flex gap-3">
                    <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {importing ? 'Saving…' : 'Save Translations'}
                    </button>
                    <button onClick={() => setStage(1)} disabled={importing} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Back</button>
                    <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 dark:text-amber-400">No valid rows to import. Fix errors and try again.</p>
              )
            ) : (
              <div className="space-y-4">
                <p className={importResult.success ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                  {importResult.success
                    ? `Saved ${importResult.data?.upserted ?? 0} translated field(s).`
                    : (importResult.message || 'Import failed')}
                </p>
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
