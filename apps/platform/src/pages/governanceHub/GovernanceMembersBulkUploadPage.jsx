/**
 * Bulk upload for Steering Committee / Project Board members.
 */
import { useState, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Upload, Download, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  previewGovernanceMemberImport,
  bulkCreateGovernanceMembers,
  downloadGovernanceMemberImportTemplate,
  GOVERNANCE_MEMBER_IMPORT_COLUMNS,
} from '../../services/projectGovernanceMembersBulkService'

const BODY_META = {
  steering_committee: {
    title: 'Steering Committee',
    listPath: '/platform/governance/steering-committee',
  },
  project_board: {
    title: 'Project Board',
    listPath: '/platform/governance/project-board',
  },
}

export default function GovernanceMembersBulkUploadPage() {
  const location = useLocation()
  const bodyType = location.pathname.includes('project-board')
    ? 'project_board'
    : 'steering_committee'
  const meta = BODY_META[bodyType]
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uid, setUid] = useState(null)

  const resolveUid = useCallback(async () => {
    if (uid) return uid
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) return null
    const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    const id = u?.id || null
    setUid(id)
    return id
  }, [uid])

  const onPickFile = async (e) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setPreview(null)
    if (!f || !projectId) return
    setBusy(true)
    try {
      const result = await previewGovernanceMemberImport(projectId, bodyType, f)
      if (!result.success && result.parseErrors?.length) {
        toast.error(result.parseErrors[0]?.message || 'Could not parse file')
      }
      setPreview(result)
    } catch (err) {
      toast.error(err?.message || 'Preview failed')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    if (!projectId || !preview?.ready?.length) {
      toast.error('No valid rows to import')
      return
    }
    setImporting(true)
    try {
      const userId = await resolveUid()
      const summary = await bulkCreateGovernanceMembers(projectId, bodyType, preview.ready, userId)
      const skippedN = preview.skipped?.length || 0
      const failedN = summary.failedCount || 0
      showSuccess({
        recordId: `${summary.importedCount} member${summary.importedCount === 1 ? '' : 's'}`,
        operation: 'created',
        message: [
          `Imported ${summary.importedCount} into ${meta.title}.`,
          skippedN ? `Skipped ${skippedN} invalid row(s) at preview.` : null,
          failedN ? `Failed ${failedN} on insert.` : null,
        ].filter(Boolean).join(' '),
        onOk: () => navigate(meta.listPath),
      })
      setPreview((p) => ({
        ...p,
        ready: failedN ? p.ready : [],
        postImportFailed: summary.failed,
        importedCount: summary.importedCount,
      }))
    } catch (err) {
      toast.error(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const downloadTpl = async (fmt) => {
    try {
      await downloadGovernanceMemberImportTemplate(fmt)
    } catch (err) {
      toast.error(err?.message || 'Template download failed')
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link
            to={meta.listPath}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Bulk {meta.title} upload
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Excel, CSV, or JSON — one member per row. Invalid rows are skipped; possible duplicates are flagged but still inserted.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">1. Download template</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Columns: {GOVERNANCE_MEMBER_IMPORT_COLUMNS.join(', ')}. Multiple emails/phones: separate with{' '}
            <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">;</code> or a new line.
          </p>
          <div className="flex flex-wrap gap-2">
            {['csv', 'xlsx', 'json'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => downloadTpl(fmt)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                {fmt === 'xlsx' ? 'Excel' : fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">2. Choose file</h2>
          {!projectId && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Select a project before uploading.</p>
          )}
          <label className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4" /> Browse file
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={!projectId || busy}
              onChange={onPickFile}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {busy ? 'Parsing…' : file ? file.name : 'No file selected'}
            </span>
          </label>
        </div>

        {preview && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">3. Upload summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Ready" value={preview.ready?.length || 0} tone="good" />
              <Stat label="Skipped" value={preview.skipped?.length || 0} tone="warn" />
              <Stat label="Anomalies" value={preview.anomalies?.length || 0} tone="info" />
              <Stat label="Imported" value={preview.importedCount ?? '—'} tone="good" />
            </div>

            {preview.parseErrors?.length > 0 && (
              <AlertList title="Parse warnings" items={preview.parseErrors.map((e) => e.message)} tone="warn" />
            )}
            {preview.anomalies?.length > 0 && (
              <AlertList title="Anomalies (still importable where ready)" items={preview.anomalies.map((a) => a.message)} tone="info" />
            )}
            {preview.skipped?.length > 0 && (
              <ul className="text-sm text-gray-700 dark:text-gray-200 max-h-40 overflow-y-auto space-y-1 list-disc pl-5">
                {preview.skipped.map((s) => (
                  <li key={`skip-${s.rowNumber}`}>
                    Row {s.rowNumber} ({s.member_name}): {s.reasons.join('; ')}
                  </li>
                ))}
              </ul>
            )}
            {preview.postImportFailed?.length > 0 && (
              <AlertList
                title="Insert failures"
                items={preview.postImportFailed.map((f) => `Row ${f.rowNumber} (${f.member_name}): ${f.reason}`)}
                tone="warn"
              />
            )}

            {preview.ready?.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Chair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.ready.slice(0, 50).map((r) => (
                      <tr key={`ready-${r.rowNumber}`}>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{r.member_name}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.role_title || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{r.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.is_chair ? 'Yes' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Link
                to={meta.listPath}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={importing || !preview.ready?.length}
                onClick={onImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing…' : `Import ${preview.ready?.length || 0} member${(preview.ready?.length || 0) === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
      {modal}
    </div>
  )
}

function Stat({ label, value, tone }) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-300 dark:border-emerald-700'
      : tone === 'warn'
        ? 'border-amber-300 dark:border-amber-700'
        : 'border-sky-300 dark:border-sky-700'
  return (
    <div className={`rounded-lg border ${toneClass} bg-gray-50 dark:bg-gray-900/40 px-3 py-2`}>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  )
}

function AlertList({ title, items, tone }) {
  const cls =
    tone === 'warn'
      ? 'text-amber-800 dark:text-amber-200'
      : 'text-sky-800 dark:text-sky-200'
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${cls}`}>{title}</h3>
      <ul className="text-sm text-gray-700 dark:text-gray-200 max-h-40 overflow-y-auto space-y-1 list-disc pl-5">
        {items.map((msg, i) => (
          <li key={`${title}-${i}`}>{msg}</li>
        ))}
      </ul>
    </div>
  )
}
