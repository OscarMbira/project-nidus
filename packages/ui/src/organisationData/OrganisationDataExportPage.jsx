/**
 * v1358 — Data export & deletion. Routed page in Platform (/platform/organisation/data-export) and Planner
 * (/app/settings/data); organisation data lives in the public schema, so this always uses platformDb.
 *
 * Slice 1 (D2–D4) export:
 *   - Account Owner only: request a full export (runs at once; one export at a time)
 *   - list of exports (rules 38, 40, 40.1, 41, 44 via SimpleRecordList): status, size, available until
 *   - download each ZIP part through a short-lived link (sign-in required; files removed after 7 days)
 * Slice 3a (D1, D5, D10–D12) deletion:
 *   - ask for deletion with a reason (field help, unsaved-changes guard); a system admin approves
 *   - the emailed link (?confirm=<token>) confirms it while signed in as the owner → organisation locked 30 days
 *   - cancel while waiting for approval, waiting for confirmation, or locked
 * Success confirmations via useSuccessModal (rule 16).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Download, Loader2, PackageOpen, RefreshCw, Trash2 } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDateTime } from '@nidus/shared/utils/registerDateTime'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import {
  DELETION_STATUS_LABELS,
  EXPORT_STATUS_LABELS,
  OPEN_DELETION_STATUSES,
  cancelOrganisationDeletion,
  confirmOrganisationDeletion,
  formatBytes,
  getExportDownloadUrl,
  listOrganisationDataRequests,
  requestOrganisationDeletion,
  requestOrganisationExport,
} from '@nidus/shared/services/organisationDataService'
import FieldLabelWithHelp from '../FieldLabelWithHelp.jsx'
import SimpleRecordList from '../SimpleRecordList.jsx'
import { clearOrganisationLockCache } from './OrganisationLockGate.jsx'

const STATUS_CLASSES = {
  queued: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  building: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}
const HELP_KEYS = ['public.organisation_data_requests.reason']
const CARD = 'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900'

function DeletionSection({ deletions, fmt, onRequest, onCancel, busy }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { confirmDiscard } = useUnsavedChangesGuard(open && reason.trim() !== '', 'Your deletion request has not been sent.')
  const current = deletions.find((d) => OPEN_DELETION_STATUSES.includes(d.status))
  const last = deletions[0]

  const close = () => confirmDiscard(() => {
    setOpen(false)
    setReason('')
  })
  const send = async () => {
    const ok = await onRequest(reason.trim())
    if (ok) { setOpen(false); setReason('') }
  }

  return (
    <section className={`${CARD} space-y-3`}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" /> Delete the organisation
      </h2>

      {current ? (
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-mono text-blue-600 dark:text-blue-400">{current.reference || 'Deletion request'}</span>
            {' — '}
            <span className="font-medium">{DELETION_STATUS_LABELS[current.status] || current.status}</span>
          </p>
          {current.status === 'pending_approval' && (
            <p>Our support team will review the request. Nothing changes until you confirm it by the link we email you after approval.</p>
          )}
          {current.status === 'awaiting_confirmation' && (
            <p>
              We emailed you a confirmation link. Open it while signed in as the Account Owner to lock the organisation. The link works
              until {fmt(current.confirm_expires_at)}; if you do nothing, the request lapses.
            </p>
          )}
          {current.status === 'locked' && (
            <p>
              The organisation is locked and will be deleted permanently on {fmt(current.deletion_due_at)}. A final export is listed
              below. You can still cancel until then.
            </p>
          )}
          {current.status === 'deleting' && <p>The organisation is being deleted. This cannot be stopped.</p>}
          {current.status !== 'deleting' && (
            confirmCancel ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Cancel this deletion request?</span>
                <button type="button" onClick={async () => { await onCancel(); setConfirmCancel(false) }} disabled={busy}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  Yes, cancel the deletion
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                Cancel deletion
              </button>
            )
          )}
        </div>
      ) : open ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Deleting removes all of the organisation’s projects, records, files and settings for everyone. After our support team
              approves, you confirm by an email link; the organisation is then locked for 30 days (you can cancel and download a final
              export) and deleted permanently after that. Our billing records and the audit logs are kept as required by law.
            </p>
          </div>
          <div>
            <FieldLabelWithHelp helpKey="public.organisation_data_requests.reason" htmlFor="org-deletion-reason"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason (required)
            </FieldLabelWithHelp>
            <textarea id="org-deletion-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy || !reason.trim()}
              className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Send deletion request
            </button>
            <button type="button" onClick={close}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>Ask for the organisation and all its data to be deleted. Download an export first if you need a copy.</p>
            {last && ['rejected', 'lapsed', 'cancelled'].includes(last.status) && (
              <p className="text-gray-500 dark:text-gray-400">
                Last request {last.reference || ''}: {DELETION_STATUS_LABELS[last.status]}{last.decision_reason ? ` — ${last.decision_reason}` : ''}.
              </p>
            )}
          </div>
          <button type="button" onClick={() => setOpen(true)}
            className="shrink-0 rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30">
            Request deletion
          </button>
        </div>
      )}
    </section>
  )
}

export default function OrganisationDataExportPage({ db = platformDb }) {
  const [state, setState] = useState({ isOwner: false, requests: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const confirmToken = searchParams.get('confirm')
  const confirmedRef = useRef(false)
  const settings = useRegionalFormatSettings()
  const { showSuccess, modal } = useSuccessModal()

  const fetchList = useCallback(() => listOrganisationDataRequests(db)
    .then((res) => { setState(res); setError('') })
    .catch((err) => setError(err?.message || 'Could not load your exports.'))
    .finally(() => setLoading(false)), [db])

  const load = useCallback(() => { setLoading(true); return fetchList() }, [fetchList])

  useEffect(() => { fetchList() }, [fetchList])

  // The emailed confirmation link: confirm once, then drop the token from the address bar.
  useEffect(() => {
    if (!confirmToken || confirmedRef.current) return
    confirmedRef.current = true
    const next = new URLSearchParams(searchParams)
    next.delete('confirm')
    setSearchParams(next, { replace: true })
    confirmOrganisationDeletion(db, confirmToken)
      .then((res) => {
        clearOrganisationLockCache()
        showSuccess({
          recordId: res?.reference || 'Deletion',
          operation: 'updated',
          message: 'Deletion confirmed. The organisation is now locked and will be deleted in 30 days. A final export is being prepared; you can cancel until then.',
        })
        return fetchList()
      })
      .catch((err) => setError(err?.message || 'Could not confirm the deletion.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmToken])

  const exportsOnly = useMemo(() => state.requests.filter((r) => r.kind !== 'deletion'), [state.requests])
  const deletions = useMemo(() => state.requests.filter((r) => r.kind === 'deletion'), [state.requests])
  const inProgress = exportsOnly.some((r) => r.status === 'queued' || r.status === 'building')

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

  const requestDeletion = async (reason) => {
    setBusy(true)
    setError('')
    try {
      const res = await requestOrganisationDeletion(db, reason)
      await load()
      showSuccess({
        recordId: res?.reference || 'Deletion request',
        operation: 'created',
        message: 'Your deletion request has been sent. Our support team will review it, then email you a link to confirm.',
      })
      return true
    } catch (err) {
      setError(err?.message || 'Could not send the deletion request.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const cancelDeletion = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await cancelOrganisationDeletion(db)
      clearOrganisationLockCache()
      await load()
      showSuccess({
        recordId: deletions.find((d) => d.id === res?.id)?.reference || 'Deletion request',
        operation: 'updated',
        message: res?.was === 'locked'
          ? 'The deletion is cancelled and the organisation is unlocked. Integrations are back on; choose a plan again under Subscription.'
          : 'The deletion request is cancelled.',
      })
    } catch (err) {
      setError(err?.message || 'Could not cancel the deletion.')
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
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            <PackageOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Data export &amp; deletion
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Download a full copy of your organisation’s data: every table as a spreadsheet (CSV) and as JSON, the files people
            uploaded, and a data dictionary explaining each column. Passwords, keys and other secrets are never included.
          </p>
        </div>

        <section className={CARD}>
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
              {loading ? 'Loading…' : 'Only the Account Owner can export or delete the organisation’s data. Ask your Account Owner if you need a copy of the data.'}
            </p>
          )}
        </section>

        {state.isOwner && (
          <SimpleRecordList
            pageId="organisation-data-exports"
            columns={columns}
            rows={exportsOnly}
            loading={loading}
            error={error}
            emptyText="No exports yet."
            searchPlaceholder="Search exports…"
            exportBaseName="Organisation exports"
          />
        )}

        {state.isOwner && !loading && (
          <DeletionSection deletions={deletions} fmt={fmt} onRequest={requestDeletion} onCancel={cancelDeletion} busy={busy} />
        )}
        {!state.isOwner && error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        {modal}
      </div>
    </FieldHelpScope>
  )
}
