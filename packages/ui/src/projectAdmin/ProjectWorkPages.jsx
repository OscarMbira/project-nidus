/**
 * v1343 (PRD A4) — the three new project pages, shared by Platform and Simulator:
 *   Home › My Approvals          tabs Timesheet flags · Document reviews
 *   Home › My Work › Meeting follow-ups
 *   Governance › Approvals History (read-only)
 * The app is read from AppConfigContext (db + app); the open project from usePlatformProjectId.
 * Lists use SimpleRecordList (search, sort, row numbers, Card / Table-List, export).
 */
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, ListTodo, History } from 'lucide-react'
import AppConfigContext from '@nidus/shared/context/AppConfigContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import {
  getCurrentInternalUserId,
  listMyMeetingFollowUps,
  listMyDocumentReviews,
  listMyTimesheetFlags,
  listProjectApprovalHistory,
} from '@nidus/shared/services/projectAdminWorkService'
import { platformDb } from '@nidus/supabase'
import SimpleRecordList from '../SimpleRecordList'

const label = (v) => (v ? String(v).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—')

function useAppDb() {
  const cfg = useContext(AppConfigContext)
  return { app: cfg?.app === 'simulator' ? 'simulator' : 'platform', db: cfg?.db || platformDb }
}

/** Loads rows with `loader()` whenever `deps` change; returns { rows, loading, error }. */
function useRows(loader, deps) {
  const [state, setState] = useState({ rows: [], loading: true, error: '', key: null })
  const key = JSON.stringify(deps)
  useEffect(() => {
    let cancelled = false
    loader()
      .then((rows) => { if (!cancelled) setState({ rows: rows || [], loading: false, error: '', key }) })
      .catch((e) => { if (!cancelled) setState({ rows: [], loading: false, error: e?.message || 'Could not load this list.', key }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state : { rows: [], loading: true, error: '' }
}

function PageShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" /> {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

function useMe(db) {
  const [me, setMe] = useState(undefined)
  useEffect(() => {
    let cancelled = false
    getCurrentInternalUserId(db).then((id) => { if (!cancelled) setMe(id) })
    return () => { cancelled = true }
  }, [db])
  return me
}

// ── Home › My Approvals ───────────────────────────────────────────────────────────────────
export function MyApprovalsPage() {
  const { app, db } = useAppDb()
  const { projectId } = usePlatformProjectId()
  const settings = useRegionalFormatSettings(app === 'platform' ? projectId : null)
  const navigate = useNavigate()
  const me = useMe(db)
  const [tab, setTab] = useState('flags')
  const date = (v) => (v ? formatRegionalDate(v, settings) : '—')

  const flags = useRows(() => (me ? listMyTimesheetFlags(me, { projectId }) : Promise.resolve([])), [me, projectId, 'flags'])
  const reviews = useRows(() => (me ? listMyDocumentReviews(db, me, { projectId: app === 'platform' ? projectId : null }) : Promise.resolve([])),
    [me, projectId, app, 'reviews'])

  const tabClass = (v) => `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === v
    ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
    : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`

  return (
    <PageShell icon={ClipboardCheck} title="My Approvals"
      subtitle="Timesheet entries you flagged for the approver, and documents waiting for your review or signature.">
      <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        <button type="button" role="tab" aria-selected={tab === 'flags'} className={tabClass('flags')} onClick={() => setTab('flags')}>Timesheet flags</button>
        <button type="button" role="tab" aria-selected={tab === 'reviews'} className={tabClass('reviews')} onClick={() => setTab('reviews')}>Document reviews</button>
      </div>
      {tab === 'flags' ? (
        <SimpleRecordList
          pageId="my-approvals-timesheet-flags"
          rows={flags.rows}
          loading={me === undefined || flags.loading}
          error={flags.error}
          emptyText="You have not flagged any timesheet entries."
          exportBaseName="my-timesheet-flags"
          columns={[
            { key: 'reasons', label: 'Reasons', primary: true },
            { key: 'entryDate', label: 'Entry date', render: (r) => date(r.entryDate) },
            { key: 'hours', label: 'Hours', render: (r) => (r.hours == null ? '—' : `${r.hours}h`) },
            { key: 'note', label: 'Note', render: (r) => r.note || '—' },
            { key: 'status', label: 'Flag', render: (r) => label(r.status) },
            { key: 'resolution', label: 'Outcome', render: (r) => r.resolution || (r.status === 'open' ? 'Waiting for the approver' : '—') },
          ]}
        />
      ) : (
        <SimpleRecordList
          pageId="my-approvals-document-reviews"
          rows={reviews.rows}
          loading={me === undefined || reviews.loading}
          error={reviews.error}
          emptyText="No documents are assigned to you for review or signature."
          exportBaseName="my-document-reviews"
          onRowClick={(r) => r.registerId && navigate(`/${app}/local-registers/${r.registerId}/${r.recordId}`)}
          columns={[
            { key: 'document', label: 'Document', primary: true },
            { key: 'role', label: 'Your role' },
            { key: 'status', label: 'Status', render: (r) => label(r.status) },
            { key: 'round', label: 'Round' },
            { key: 'done', label: 'Done on', render: (r) => date(r.done) },
          ]}
        />
      )}
    </PageShell>
  )
}

// ── Home › My Work › Meeting follow-ups ───────────────────────────────────────────────────
export function MeetingFollowUpsPage() {
  const { app, db } = useAppDb()
  const { projectId } = usePlatformProjectId()
  const settings = useRegionalFormatSettings(app === 'platform' ? projectId : null)
  const me = useMe(db)
  const date = (v) => (v ? formatRegionalDate(v, settings) : '—')
  const list = useRows(() => (me ? listMyMeetingFollowUps(db, me, { projectId: app === 'platform' ? projectId : null }) : Promise.resolve([])),
    [me, projectId, app])

  return (
    <PageShell icon={ListTodo} title="Meeting Follow-ups" subtitle="Action items from meetings that are assigned to you.">
      <SimpleRecordList
        pageId="meeting-follow-ups"
        rows={list.rows}
        loading={me === undefined || list.loading}
        error={list.error}
        emptyText="No meeting action items are assigned to you."
        exportBaseName="meeting-follow-ups"
        columns={[
          { key: 'item', label: 'Action item', primary: true },
          { key: 'meeting', label: 'Meeting' },
          { key: 'meetingDate', label: 'Meeting date', render: (r) => date(r.meetingDate) },
          { key: 'due', label: 'Due', render: (r) => date(r.due) },
          { key: 'priority', label: 'Priority', render: (r) => label(r.priority) },
          { key: 'status', label: 'Status', render: (r) => label(r.status) },
        ]}
      />
    </PageShell>
  )
}

// ── Governance › Approvals History ────────────────────────────────────────────────────────
export function ApprovalsHistoryPage() {
  const { app, db } = useAppDb()
  const { projectId } = usePlatformProjectId()
  const settings = useRegionalFormatSettings(app === 'platform' ? projectId : null)
  const date = (v) => (v ? formatRegionalDate(v, settings) : '—')
  const list = useRows(() => listProjectApprovalHistory(db, app, projectId), [projectId, app])

  return (
    <PageShell icon={History} title="Approvals History"
      subtitle="Decisions taken on this project's records, with who decided and why. Read-only.">
      {!projectId ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Open a project to see its approvals.</p>
      ) : (
        <SimpleRecordList
          pageId="approvals-history"
          rows={list.rows}
          loading={list.loading}
          error={list.error}
          emptyText="No decisions have been recorded on this project yet."
          exportBaseName="approvals-history"
          columns={[
            { key: 'record', label: 'Record', primary: true },
            { key: 'type', label: 'Type', render: (r) => label(r.type) },
            { key: 'level', label: 'Approval step', render: (r) => r.level || '—' },
            { key: 'requestedBy', label: 'Requested by', render: (r) => r.requestedBy || '—' },
            { key: 'decidedBy', label: 'Decided by', render: (r) => r.decidedBy || '—' },
            { key: 'decision', label: 'Decision', render: (r) => label(r.decision) },
            { key: 'decidedAt', label: 'Date', render: (r) => date(r.decidedAt) },
            { key: 'justification', label: 'Justification', render: (r) => r.justification || '—' },
          ]}
        />
      )}
    </PageShell>
  )
}
