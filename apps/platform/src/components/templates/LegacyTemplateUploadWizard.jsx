import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RowActionButton } from '@nidus/ui'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  applyColumnMapping,
  scheduleRowsToBundle,
  validateScheduleBundle,
  validateStructuredListRows,
  LIST_TYPE_FIELDS,
  SCHEDULE_CANONICAL,
} from '@nidus/shared/utils/legacyTemplateParse'
import {
  uploadLegacyTemplateFile,
  createLegacyDocumentTemplate,
  createStructuredListTemplate,
  createScheduleFromLegacyUpload,
} from '@nidus/shared/services/legacyTemplateService'
import {
  createTemplate,
  replaceTemplateChildren,
} from '../../services/industryTemplateService'
import { parseTabularFile, buildSchedulePreview, buildStructuredListPreview } from '../../services/legacyTemplateFileParseService'
import { extractTextFromOfficeFile } from '../../services/legacyTemplateExtractService'

const STEPS = ['file', 'preview', 'result']
const TRACKS = [
  { id: 'schedule', label: 'Schedule (Excel / CSV / MSPDI XML)' },
  { id: 'document', label: 'Reference document (Word / PDF / PowerPoint)' },
  { id: 'structured_list', label: 'Structured list (Risk / RAID / Stakeholder / Budget)' },
]

async function resolveUserId() {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id || null
}

export default function LegacyTemplateUploadWizard({
  defaultTrack = 'schedule',
  onDone,
  db = platformDb,
  createTemplateFn = createTemplate,
  replaceChildrenFn = replaceTemplateChildren,
  backTo = '/pmo/industry-templates',
}) {
  const navigate = useNavigate()
  const [track, setTrack] = useState(defaultTrack)
  const [listType, setListType] = useState('risk_register')
  const [step, setStep] = useState('file')
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])

  const accept = useMemo(() => {
    if (track === 'document') return '.doc,.docx,.pdf,.ppt,.pptx,.odt,.odp,.txt'
    if (track === 'structured_list') return '.csv,.xlsx,.xls'
    return '.csv,.xlsx,.xls,.xml,.mpp'
  }, [track])

  const onPickFiles = async (e) => {
    const picked = [...(e.target.files || [])]
    if (!picked.length) return
    setBusy(true)
    setResults([])
    try {
      const next = []
      for (const file of picked) {
        const base = {
          id: crypto.randomUUID(),
          file,
          title: file.name.replace(/\.[^.]+$/, ''),
          error: null,
        }
        if (track === 'document') {
          const extracted = await extractTextFromOfficeFile(file)
          next.push({
            ...base,
            docCategory: 'other',
            extractedText: extracted,
            previewSnippet: extracted.slice(0, 600),
          })
        } else if (track === 'schedule') {
          try {
            const parsed = await parseTabularFile(file)
            const preview = buildSchedulePreview(parsed.sheets)
            const bundle = scheduleRowsToBundle(preview.mappedRows)
            const validation = validateScheduleBundle(bundle)
            next.push({
              ...base,
              sheets: parsed.sheets,
              mapping: preview.mapping,
              mappedRows: preview.mappedRows,
              bundle,
              validation,
              format: parsed.format,
            })
          } catch (err) {
            next.push({ ...base, error: err.message })
          }
        } else {
          const parsed = await parseTabularFile(file)
          const preview = buildStructuredListPreview(listType, parsed.sheets)
          const validation = validateStructuredListRows(listType, preview.mappedRows)
          next.push({
            ...base,
            sheets: parsed.sheets,
            mapping: preview.mapping,
            mappedRows: preview.mappedRows,
            validation,
          })
        }
      }
      setFiles(picked)
      setItems(next)
      setStep('preview')
    } catch (err) {
      toast.error(err.message || 'Failed to read files')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it
      const merged = { ...it, ...patch }
      if (track === 'schedule' && (patch.mapping || patch.title)) {
        const mapping = patch.mapping || merged.mapping
        const mappedRows = applyColumnMapping(merged.sheets?.[0]?.rows || [], mapping)
        const bundle = scheduleRowsToBundle(mappedRows)
        return {
          ...merged,
          mapping,
          mappedRows,
          bundle,
          validation: validateScheduleBundle(bundle),
        }
      }
      if (track === 'structured_list' && patch.mapping) {
        const mappedRows = applyColumnMapping(
          (merged.sheets || []).flatMap((s) => s.rows || []),
          patch.mapping,
        )
        return {
          ...merged,
          mapping: patch.mapping,
          mappedRows,
          validation: validateStructuredListRows(listType, mappedRows),
        }
      }
      return merged
    }))
  }

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id))

  const commit = async () => {
    setBusy(true)
    try {
      const accountId = await getCurrentUserAccountId()
      const userId = await resolveUserId()
      if (!accountId) throw new Error('No account resolved for current user')

      const out = []
      for (const item of items) {
        if (item.error) {
          out.push({ title: item.title, ok: false, error: item.error })
          continue
        }
        try {
          if (track === 'schedule') {
            if (!item.validation?.valid) throw new Error(item.validation?.errors?.join('; ') || 'Invalid schedule')
            const template = await createScheduleFromLegacyUpload({
              createTemplateFn,
              replaceTemplateChildrenFn: replaceChildrenFn,
              title: item.title,
              bundle: item.bundle,
            })
            out.push({ title: item.title, ok: true, id: template.id, kind: 'schedule' })
          } else if (track === 'document') {
            const uploaded = await uploadLegacyTemplateFile(db, {
              accountId,
              file: item.file,
            })
            const { template } = await createLegacyDocumentTemplate(db, {
              accountId,
              userId,
              title: item.title,
              docCategory: item.docCategory || 'other',
              originalFilename: uploaded.original_filename,
              storageBucket: uploaded.storage_bucket,
              storagePath: uploaded.storage_path,
              fileSize: uploaded.file_size,
              mimeType: uploaded.mime_type,
              extractedText: item.extractedText || '',
              status: 'published',
            })
            out.push({ title: item.title, ok: true, id: template.id, kind: 'document' })
          } else {
            if (!item.validation?.validRows?.length) {
              throw new Error(item.validation?.errors?.join('; ') || 'No valid rows')
            }
            const { template } = await createStructuredListTemplate(db, {
              accountId,
              userId,
              title: item.title,
              listType,
              rows: item.validation.validRows,
              columnMapping: item.mapping || {},
              status: 'published',
            })
            out.push({ title: item.title, ok: true, id: template.id, kind: 'structured_list' })
          }
        } catch (err) {
          out.push({ title: item.title, ok: false, error: err.message || String(err) })
        }
      }
      setResults(out)
      setStep('result')
      const ok = out.filter((r) => r.ok).length
      if (ok) toast.success(`Imported ${ok} of ${out.length} file(s)`)
      else toast.error('Import failed for all files')
      onDone?.(out)
    } catch (err) {
      toast.error(err.message || 'Commit failed')
    } finally {
      setBusy(false)
    }
  }

  const canonicalFields = track === 'structured_list'
    ? LIST_TYPE_FIELDS[listType]
    : SCHEDULE_CANONICAL

  return (
    <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/50 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Legacy templates</p>
          <h2 className="text-xl font-semibold text-slate-100">Upload legacy template</h2>
          <p className="mt-1 text-sm text-slate-400">
            Import schedules, reference documents, or structured lists into the PM Template Hierarchy.
          </p>
        </div>
        <Link to={backTo} className="text-sm text-blue-400 hover:underline">
          Back to Industry Templates
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((s) => (
          <span
            key={s}
            className={`rounded px-2 py-1 ${step === s ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {step === 'file' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTrack(t.id); setFiles([]); setItems([]) }}
                className={`rounded-lg border px-3 py-3 text-left text-sm ${
                  track === t.id
                    ? 'border-blue-500 bg-blue-950/40 text-blue-100'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {track === 'structured_list' && (
            <label className="block text-sm text-slate-300">
              List type
              <select
                value={listType}
                onChange={(e) => setListType(e.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
              >
                <option value="risk_register">Risk register</option>
                <option value="raid_log">RAID log</option>
                <option value="stakeholder_register">Stakeholder register</option>
                <option value="budget">Budget</option>
              </select>
            </label>
          )}

          {track === 'schedule' && (
            <p className="text-xs text-slate-500">
              MS Project: upload MSPDI <code className="text-slate-300">.xml</code> (File → Save As → XML).
              Raw <code className="text-slate-300">.mpp</code> must be converted locally with{' '}
              <code className="text-slate-300">@byteink/mppjs</code> first.
            </p>
          )}

          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-600 p-8 text-center hover:border-blue-500">
            <input
              type="file"
              className="hidden"
              accept={accept}
              multiple
              disabled={busy}
              onChange={onPickFiles}
            />
            <p className="text-slate-200">{busy ? 'Reading…' : 'Drop or click to select file(s)'}</p>
            <p className="mt-1 text-xs text-slate-500">Single or bulk — review before commit</p>
          </label>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <label className="block text-xs text-slate-400">
                    Title
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                    />
                  </label>
                  <p className="text-xs text-slate-500">{item.file?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>

              {item.error && <p className="text-sm text-red-400">{item.error}</p>}

              {track === 'document' && !item.error && (
                <>
                  <label className="block text-xs text-slate-400">
                    Category
                    <select
                      value={item.docCategory || 'other'}
                      onChange={(e) => updateItem(item.id, { docCategory: e.target.value })}
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm"
                    >
                      <option value="charter">Charter</option>
                      <option value="brd">BRD</option>
                      <option value="status_report">Status report / deck</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 text-xs text-slate-300">
                    {item.previewSnippet || '(No text extracted — file will still be stored.)'}
                  </pre>
                </>
              )}

              {(track === 'schedule' || track === 'structured_list') && !item.error && (
                <>
                  <p className="text-xs text-slate-400">
                    {track === 'schedule'
                      ? `Phases preview: ${item.bundle?.phases?.length || 0} · Activities: ${item.bundle?.activities?.length || 0}`
                      : `Valid rows: ${item.validation?.validRows?.length || 0} · Invalid: ${item.validation?.invalidRows?.length || 0}`}
                  </p>
                  {item.validation?.errors?.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-amber-300">
                      {item.validation.errors.slice(0, 8).map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  )}
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer">Column mapping</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.keys(item.mapping || {}).map((src) => (
                        <label key={src} className="flex items-center gap-2">
                          <span className="w-28 truncate text-slate-500" title={src}>{src}</span>
                          <select
                            value={item.mapping[src] || ''}
                            onChange={(e) => updateItem(item.id, {
                              mapping: { ...item.mapping, [src]: e.target.value || null },
                            })}
                            className="flex-1 rounded border border-slate-600 bg-slate-900 px-1 py-1"
                          >
                            <option value="">— skip —</option>
                            {canonicalFields.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </article>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setStep('file'); setItems([]); setFiles([]) }}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || !items.length || items.every((i) => i.error)}
              onClick={commit}
              className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {busy ? 'Importing…' : `Confirm import (${items.length})`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-3">
          <ul className="space-y-2 text-sm">
            {results.map((r) => (
              <li
                key={`${r.title}-${r.id || r.error}`}
                className={r.ok ? 'text-emerald-300' : 'text-red-300'}
              >
                {r.ok ? `✓ ${r.title} (${r.kind})` : `✗ ${r.title}: ${r.error}`}
                {r.ok && r.kind === 'schedule' && (
                  <RowActionButton
                    variant="edit"
                    label="Edit template"
                    className="ml-2"
                    onClick={() => navigate(`/pmo/industry-templates/${r.id}/edit`)}
                  />
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => { setStep('file'); setItems([]); setFiles([]); setResults([]) }}
            className="rounded bg-blue-700 px-4 py-2 text-sm text-white"
          >
            Upload more
          </button>
        </div>
      )}
    </div>
  )
}
