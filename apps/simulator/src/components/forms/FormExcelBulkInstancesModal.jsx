import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '@nidus/ui/Modal'
import Button from '@nidus/ui/Button'
import { parseFormExcelFile } from '../../services/formExcelFileParseService'
import { createFormInstance, updateFormValues } from '../../services/formEngineService'
import {
  analyzeFormExcelMatrix,
  buildInstanceValuesFromExcelRow,
  suggestExcelToFieldMapping,
  FORM_EXCEL_MAX_DATA_ROWS,
  CATEGORY_FIELD_KEY,
} from '@nidus/shared/utils/formExcelImportUtils.js'

/**
 * Bulk-create draft form instances from Excel/CSV data rows (v857 Phase 3).
 */
export default function FormExcelBulkInstancesModal({
  isOpen,
  onClose,
  projectId,
  templateCode,
  templateFields = [],
  mode = 'platform',
  onCreated,
}) {
  const [step, setStep] = useState('upload')
  const [busy, setBusy] = useState(false)
  const [sheets, setSheets] = useState([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [analyzed, setAnalyzed] = useState(null)
  const [columnMap, setColumnMap] = useState({}) // colIndex → fieldKey | null

  const fieldOptions = useMemo(
    () => (templateFields || []).map((f) => ({ key: f.key, label: f.label || f.key })),
    [templateFields],
  )

  const reset = () => {
    setStep('upload')
    setBusy(false)
    setSheets([])
    setSheetIndex(0)
    setAnalyzed(null)
    setColumnMap({})
  }

  const handleClose = () => {
    if (busy) return
    reset()
    onClose?.()
  }

  const applyAnalysis = (matrix) => {
    const result = analyzeFormExcelMatrix(matrix)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.totalDataRows === 0) {
      toast.error('No data rows found under the header')
      return
    }
    if (result.truncated) {
      toast.error(
        `File has ${result.totalDataRows} data rows. Split the file — max ${FORM_EXCEL_MAX_DATA_ROWS} rows per upload.`,
      )
      return
    }
    setAnalyzed(result)
    setColumnMap(suggestExcelToFieldMapping(result.columns, templateFields))
    setStep('map')
  }

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const parsed = await parseFormExcelFile(file)
      const list = parsed.sheets || []
      if (!list.length) throw new Error('No sheets found')
      setSheets(list)
      setSheetIndex(0)
      applyAnalysis(list[0].matrix)
    } catch (e) {
      toast.error(e.message || 'Failed to read file')
    } finally {
      setBusy(false)
    }
  }

  const mappedColumns = useMemo(() => {
    if (!analyzed) return []
    return analyzed.columns.map((col) => ({
      ...col,
      key: columnMap[col.colIndex] || null,
      skip: !columnMap[col.colIndex],
    }))
  }, [analyzed, columnMap])

  const handleCreate = async () => {
    if (!projectId || !templateCode || !analyzed) return
    const mappedCount = mappedColumns.filter((c) => c.key).length
    if (mappedCount === 0 && !analyzed.categoryOptions?.length) {
      toast.error('Map at least one column to a form field')
      return
    }
    setBusy(true)
    let created = 0
    let failed = 0
    try {
      let lastError = ''
      for (const row of analyzed.dataRows) {
        const values = buildInstanceValuesFromExcelRow(row, mappedColumns, templateFields)
        // Drop Category if template has no Category field
        if (!templateFields.some((f) => f.key === CATEGORY_FIELD_KEY)) {
          delete values[CATEGORY_FIELD_KEY]
        }
        const inst = await createFormInstance(projectId, templateCode, null, mode)
        if (!inst.success) {
          failed += 1
          lastError = inst.message || lastError
          continue
        }
        const saved = await updateFormValues(inst.data.id, values, mode)
        if (!saved.success) {
          failed += 1
          lastError = saved.message || lastError
          continue
        }
        created += 1
      }
      if (created > 0) {
        toast.success(`Created ${created} draft form${created === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}`)
        onCreated?.(created)
        reset()
        onClose?.()
      } else {
        const hint = /403|row-level security|permission|jwt/i.test(lastError)
          ? ' Apply SQL/v858_form_instances_project_member_rls.sql then SQL/v859_create_draft_form_instance_rpc.sql in Supabase (in that order), then hard-refresh.'
          : ''
        toast.error(
          failed
            ? `Could not create any drafts${lastError ? `: ${lastError}` : ''}.${hint}`
            : 'Nothing to create',
        )
      }
    } catch (e) {
      toast.error(e.message || 'Bulk upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk upload form rows"
      size="lg"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {step === 'map' && (
            <Button type="button" onClick={handleCreate} loading={busy} disabled={busy}>
              {busy
                ? 'Creating…'
                : `Create ${analyzed?.dataRows?.length || 0} draft${(analyzed?.dataRows?.length || 0) === 1 ? '' : 's'}`}
            </Button>
          )}
        </>
      )}
    >
      {step === 'upload' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Upload .xlsx or .csv for template <span className="font-mono">{templateCode}</span>.
            Each data row becomes a <strong>draft</strong> form instance. Banner rows fill the
            Category field. Max {FORM_EXCEL_MAX_DATA_ROWS} rows per upload (insert-only; no dedupe).
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy || !templateCode}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white dark:text-gray-200"
          />
        </div>
      )}

      {step === 'map' && analyzed && (
        <div className="space-y-4">
          {sheets.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Sheet</label>
              <select
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                value={sheetIndex}
                onChange={(e) => {
                  const i = Number(e.target.value)
                  setSheetIndex(i)
                  applyAnalysis(sheets[i].matrix)
                }}
              >
                {sheets.map((s, i) => (
                  <option key={s.name} value={i}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Preview: <strong>{analyzed.dataRows.length}</strong> draft
            {analyzed.dataRows.length === 1 ? '' : 's'} will be created
            {analyzed.categoryOptions?.length
              ? ` · Category options: ${analyzed.categoryOptions.join(', ')}`
              : ''}
          </p>

          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-2">Excel column</th>
                  <th className="px-2 py-2">Maps to form field</th>
                </tr>
              </thead>
              <tbody>
                {analyzed.columns.map((col) => (
                  <tr key={col.colIndex} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-1.5 text-gray-800 dark:text-gray-200">{col.label}</td>
                    <td className="px-2 py-1.5">
                      <select
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        value={columnMap[col.colIndex] || ''}
                        onChange={(e) => {
                          const v = e.target.value || null
                          setColumnMap((prev) => ({ ...prev, [col.colIndex]: v }))
                        }}
                      >
                        <option value="">— Skip —</option>
                        {fieldOptions.map((f) => (
                          <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                        ))}
                      </select>
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
