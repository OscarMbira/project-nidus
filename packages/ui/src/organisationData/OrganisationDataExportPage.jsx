/**
 * v1358 Slice 1 — Data export (PRD D2–D4). Routed page in Platform (/platform/organisation/data-export) and
 * Planner (/app/settings/data); organisation data lives in the public schema, so this always uses platformDb.
 *
 *   - Account Owner only: request a full export (runs at once; one export at a time)
 *   - list of requests (rules 38, 40, 40.1, 41, 44 via SimpleRecordList): status, size, available until
 *   - download each ZIP part through a short-lived link (sign-in required; files removed after 7 days)
 * No input fields, so no field help; success confirmation via useSuccessModal (rule 16).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, PackageOpen, RefreshCw } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDateTime } from '@nidus/shared/utils/registerDateTime'
import {
  EXPORT_STATUS_LABELS,
  formatBytes,
  getExportDownloadUrl,
  listOrganisationDataRequests,
  requestOrganisationExport,
} from '@nidus/shared/services/organisationDataService'
import SimpleRecordList from '../SimpleRecordList.jsx'

const STATUS_CLASSES = {
  queued: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  building: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export default function OrganisationDataExportPage({ db = platformDb }) {
  const [state, setState] = useState({ isOwner: false, requests: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState('')
  const settings = useRegionalFormatSettings()
  const { showSuccess, modal } = useSuccessModal()

  const fetchList = useCallback(() => listOrganisationDataRequests(db)
    .then((res) => { setState(res); setError('') })
    .catch((err) => setError(err?.message || 'Could not load your exports.'))
    .finally(() => setLoading(false)), [db])

  const load = useCallback(() => { setLoading(true); return fetchList() }, [fetchList])

  useEffect(() => { fetchList() }, [fetchList])

  const inProgress = state.requests.some((r) => r.status === 'queued' || r.status === 'building')

  const request = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await requestOrganisationExport(db)
      await load()
      showSuccess({
        recordId: res?.reference || 'Export',
        operation: 'created',
        message: 'Your export is being prepared. You’ll get an email when it’s ready to download here.',
      })
    } catch (err) {
      setError(err?.message || 'Could not start the export.')
    } finally {
      setBusy(false)
    }
  }

  const download = async (file) => {
    setDownloading(file.path)
    setError('')
    try {
      const url = await getExportDownloadUrl(db, file)
      if (url) window.location.assign(url)
    } catch (err) {
      setError(err?.message || 'Could not download this file. It may have expired.')
    } finally {
      setDownloading('')
    }
  }

  const fmt = useCallback((v) => (v ? formatRegionalDateTime(v, settings) : '—'), [settings])

  const columns = useMemo(() => [
    { key: 'reference', label: 'Reference', primary: true, render: (r) => <span className="font-mono text-blue-600 dark:text-blue-400">{r.reference || '—'}</span> },
    {
      key: 'status', label: 'Status',
      sortValue: (r) => EXPORT_STATUS_LABELS[r.status] || r.status,
      render: (r) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[r.status] || STATUS_CLASSES.queued}`} title={r.error || undefined}>
          {EXPORT_STATUS_LABELS[r.status] || r.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Requested', sortValue: (r) => r.created_at, render: (r) => fmt(r.created_at) },
    { key: 'requested_by', label: 'Requested by' },
    { key: 'row_count', label: 'Records', sortValue: (r) => Number(r.row_count) || 0, render: (r) => (r.row_count == null ? '—' : Number(r.row_count).toLocaleString()) },
    { key: 'byte_size', label: 'Size', sortValue: (r) => Number(r.byte_size) || 0, render: (r) => (r.byte_size ? formatBytes(r.byte_size) : '—') },
    { key: 'expires_at', label: 'Available until', sortValue: (r) => r.expires_at, render: (r) => (r.status === 'ready' ? fmt(r.expires_at) : '—') },
    {
      key: 'files', label: 'Download',
      sortValue: (r) => (r.files || []).length,
      render: (r) => (r.status !== 'ready' || !(r.files || []).length ? (r.status === 'failed' && r.error ? <span className="text-xs text-red-600 dark:text-red-400">{r.error}</span> : '—') : (
        <div className="flex flex-wrap gap-2">
          {r.files.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={(e) => { e.stopPropagation(); download(f) }}
              disabled={downloading === f.path}
              className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {downloading === f.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {r.files.length > 1 ? `Part ${f.part}` : 'ZIP'}{f.size ? ` (${formatBytes(f.size)})` : ''}
            </button>
          ))}
        </div>
      )),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [fmt, downloading])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          <PackageOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Data export
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Download a full copy of your organisation’s data: every table as a spreadsheet (CSV) and as JSON, the files people
          uploaded, and a data dictionary explaining each column. Passwords, keys and other secrets are never included.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {state.isOwner ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The export starts straight away. We email you when it’s ready, and you download it from this page. It stays available
              for 7 days, then it is removed; you can request a new one at any time.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button
                type="button"
                onClick={request}
                disabled={busy || inProgress || loading}
                title={inProgress ? 'An export is already being prepared' : undefined}
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Request export
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {loading ? 'Loading…' : 'Only the Account Owner can request an organisation export. Ask your Account Owner if you need a copy of the data.'}
          </p>
        )}
      </section>

      {state.isOwner && (
        <SimpleRecordList
          pageId="organisation-data-exports"
          columns={columns}
          rows={state.requests}
          loading={loading}
          error={error}
          emptyText="No exports yet."
          searchPlaceholder="Search exports…"
          exportBaseName="Organisation exports"
        />
      )}
      {!state.isOwner && error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {modal}
    </div>
  )
}
