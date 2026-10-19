/**
 * v1239 Slice 4.4 — Import / export the schedule.
 *   Import: 1. choose a file (XML, XLSX, CSV) → 2. check the preview (tasks, links, problems)
 *           → 3. confirm. Tasks are added to the project; nothing already there changes.
 *   Export: the current plan as XLSX (with Instructions + Legend sheets), CSV (with a `#` data
 *           dictionary) or XML. Templates come in XLSX and CSV, each with its legend (rule 71).
 *   v1272 Phase 2: a spreadsheet laid out differently (another tool's export) goes through the Import
 *           Mapper step first (Platform and Simulator; not in the Planner edition, PRD D16).
 */
import { useState } from 'react'
import { Download, Upload, FileCheck2 } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { dictionaryFromColumns, needsMapping, readTabularFile } from '@nidus/shared/utils/importMapping'
import ColumnMappingStep from '@nidus/ui/ai/ColumnMappingStep.jsx'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import {
  buildPreview, readCsv, readXml, readWorkbook, buildCsv, buildWorkbook, buildXml,
  toExportRows, downloadBlob, TYPE_TO_DB, TEMPLATE_COLUMNS,
} from '../../services/scheduleExchangeService.js'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const btn = 'inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
const STEPS = ['Choose file', 'Check', 'Done']
const SCHEDULE_DICTIONARY = dictionaryFromColumns(TEMPLATE_COLUMNS)

async function readFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xml')) return readXml(await file.text())
  if (name.endsWith('.csv')) return readCsv(await file.text())
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    return readWorkbook(XLSX, await file.arrayBuffer())
  }
  throw new Error('Choose an .xml, .xlsx or .csv file.')
}

export default function ScheduleExchangeScreen() {
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const { showSuccess, modal } = useSuccessModal()
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [mappingInput, setMappingInput] = useState(null) // v1272 Import Mapper: { headers, rows }
  const { app } = useAppConfig()

  const choose = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const lower = file.name.toLowerCase()
      if (app !== 'planner' && /\.(csv|xlsx|xls)$/.test(lower)) {
        const raw = await readTabularFile(file)
        if (raw.rows.length && needsMapping(raw.headers, SCHEDULE_DICTIONARY)) {
          setFileName(file.name)
          setMappingInput(raw)
          return
        }
      }
      const rows = await readFile(file)
      setFileName(file.name)
      setPreview(buildPreview(rows))
      setStep(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await schedule.data.importPlan(projectId, preview, TYPE_TO_DB)
      setStep(2)
      showSuccess({
        recordId: fileName,
        operation: 'created',
        message: `${result.tasks} task(s) and ${result.links} link(s) imported.${result.recalculated ? '' : ' Press Recalculate to work out the dates.'}`,
      })
      schedule.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setStep(0); setPreview(null); setFileName(''); setError(null) }

  const exportAs = async (format, template = false) => {
    setError(null)
    try {
      const rows = template ? [] : toExportRows(schedule.tasks, schedule.dependencies)
      const base = template ? 'schedule_import_template' : `schedule_${new Date().toISOString().slice(0, 10)}`
      if (format === 'csv') downloadBlob(buildCsv(rows), `${base}.csv`, 'text/csv;charset=utf-8')
      else if (format === 'xml') downloadBlob(buildXml(rows), `${base}.xml`, 'application/xml')
      else {
        const XLSX = await import('xlsx')
        const out = XLSX.write(buildWorkbook(XLSX, rows), { bookType: 'xlsx', type: 'array' })
        downloadBlob(new Blob([out], { type: XLSX_TYPE }), `${base}.xlsx`, XLSX_TYPE)
      }
    } catch (err) {
      setError(err.message || 'Could not create the file.')
    }
  }

  return (
    <ScheduleLayout title="Import / export" description="Bring a schedule in from another planning tool, or take this plan out." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import</h2>
              <ol className="flex gap-2 text-xs" aria-label="Import steps">
                {STEPS.map((s, i) => (
                  <li key={s} aria-current={i === step ? 'step' : undefined}
                    className={`px-2 py-1 rounded-full ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {step === 0 && mappingInput && (
              <ColumnMappingStep
                target="schedule_tasks"
                templateLabel="Schedule"
                columns={TEMPLATE_COLUMNS}
                headers={mappingInput.headers}
                rows={mappingInput.rows}
                onCancel={() => { setMappingInput(null); setFileName('') }}
                onConfirm={({ rows }) => {
                  setMappingInput(null)
                  try {
                    setPreview(buildPreview(rows))
                    setStep(1)
                  } catch (err) {
                    setError(err.message)
                  }
                }}
              />
            )}

            {step === 0 && !mappingInput && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">Choose a schedule file: XML from a desktop planning tool, or a spreadsheet (XLSX / CSV) laid out like the template.</p>
                <label className={`${btn} cursor-pointer w-fit`}>
                  <Upload className="h-4 w-4" /> {busy ? 'Reading…' : 'Choose file'}
                  <input type="file" accept=".xml,.xlsx,.xls,.csv" className="sr-only" onChange={choose} disabled={busy} />
                </label>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400 self-center">Template:</span>
                  <button type="button" className={btn} onClick={() => exportAs('xlsx', true)}><Download className="h-4 w-4" /> XLSX</button>
                  <button type="button" className={btn} onClick={() => exportAs('csv', true)}><Download className="h-4 w-4" /> CSV</button>
                </div>
              </div>
            )}

            {step === 1 && preview && (
              <div className="space-y-3">
                <p className="text-sm text-gray-800 dark:text-gray-200"><span className="font-medium">{fileName}</span>: {preview.tasks.length} task(s), {preview.links.length} link(s).</p>
                {preview.errors.length > 0 && (
                  <div role="alert" className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-200">
                    <p className="font-medium">Fix these in the file, then choose it again:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">{preview.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>
                    {preview.errors.length > 20 && <p className="mt-1">…and {preview.errors.length - 20} more.</p>}
                  </div>
                )}
                {preview.warnings.length > 0 && (
                  <ul className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-100 list-disc pl-8">
                    {preview.warnings.slice(0, 10).map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                <PlanningTable
                  pageId="schedule-import-preview"
                  keepOrder
                  columns={[
                    { key: 'task_name', label: 'Task' },
                    { key: 'ref', label: 'File ID' },
                    { key: 'estimated_duration_days', label: 'Duration (days)' },
                    { key: 'planned_start_date', label: 'Start' },
                    { key: 'planned_end_date', label: 'Finish' },
                    { key: 'is_milestone', label: 'Milestone', value: (t) => (t.is_milestone ? 'Yes' : 'No') },
                  ]}
                  rows={preview.tasks.map((t) => ({ ...t, id: t.ref }))}
                  exportName="ImportPreview"
                />
                <div className="flex gap-2">
                  <button type="button" className={btn} onClick={reset} disabled={busy}>Choose another file</button>
                  <button type="button" onClick={confirmImport} disabled={busy || preview.errors.length > 0 || !preview.tasks.length}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                    <FileCheck2 className="h-4 w-4" /> {busy ? 'Importing…' : `Import ${preview.tasks.length} task(s)`}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-800 dark:text-gray-200">Import finished. The tasks are on the Tasks and Plan Sheet tabs.</p>
                <button type="button" className={btn} onClick={reset}>Import another file</button>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Export this plan</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">{schedule.tasks.length} task(s), {schedule.dependencies.length} link(s).</p>
            <div className="flex flex-col gap-2">
              <button type="button" className={btn} disabled={!schedule.tasks.length} onClick={() => exportAs('xlsx')}><Download className="h-4 w-4" /> Spreadsheet (XLSX)</button>
              <button type="button" className={btn} disabled={!schedule.tasks.length} onClick={() => exportAs('csv')}><Download className="h-4 w-4" /> CSV</button>
              <button type="button" className={btn} disabled={!schedule.tasks.length} onClick={() => exportAs('xml')}><Download className="h-4 w-4" /> XML (for desktop planning tools)</button>
            </div>
          </section>
        </div>
      )}
      {modal}
    </ScheduleLayout>
  )
}
