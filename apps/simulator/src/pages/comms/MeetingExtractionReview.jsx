/**
 * Meeting → registers review checklist (v1272 Phase 2, PRD D13, stories 29–31, 35).
 * Route: comms/review/:meetingId (Platform) · simulator/comms/review/:meetingId (Simulator).
 *
 * "File to registers" runs the Meeting-to-Register agent, which stages the meeting's actions, risks,
 * issues and decisions and suggests owners, due dates, the organisation's own values and possible
 * duplicates. The person then chooses, per item: create a draft, add it as an update to the existing
 * record, or set it aside. Nothing reaches a register until they press "File selected items".
 *
 * v1290: only people whose role may use Pending AI Reviews (can_use on that menu item) can run the
 * agent or file items. Everyone else, Team Members by default, sees the items read-only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bot, CheckCircle2, Eye, Loader2, TriangleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb, simDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useIsSimulator } from './useIsSimulator'
import {
  canFileMeetingItems,
  defaultChoice,
  FILING_KINDS,
  fileMeetingItem,
  filingSummary,
  isHandled,
  itemTitle,
  loadStagedItems,
  runMeetingRegisterAgent,
} from '../../services/communications/meetingFilingService'

const CHOICE_LABEL = { create: 'Create draft', update: 'Add to existing record', reject: 'Set aside', later: 'Decide later' }
const STATUS_LABEL = { created: 'Draft created', merged: 'Added to existing record', rejected: 'Set aside', dismissed: 'Set aside', converted_to_task: 'Converted to task', completed: 'Completed' }

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

export default function MeetingExtractionReview() {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const isSim = useIsSimulator()
  const client = isSim ? simDb : platformDb
  const { showSuccess, modal } = useSuccessModal()

  const [meeting, setMeeting] = useState(null)
  const [hasTranscript, setHasTranscript] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState({ action: [], risk: [], issue: [], decision: [] })
  const [choices, setChoices] = useState({}) // rowId → choice
  const [edits, setEdits] = useState({}) // rowId → { title, dueDate, ownerId }
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [filing, setFiling] = useState(false)
  const [error, setError] = useState('')
  const [canFile, setCanFile] = useState(null) // null while checking; view-only until confirmed
  const readOnly = canFile !== true

  const load = useCallback(async () => {
    setError('')
    const [m, staged, tr] = await Promise.all([
      client.from('comm_meetings').select('*').eq('id', meetingId).maybeSingle(),
      loadStagedItems(isSim, meetingId).catch((e) => { setError(e.message); return null }),
      client.from('comm_meeting_transcripts').select('id').eq('meeting_id', meetingId).limit(1),
    ])
    setMeeting(m.data || null)
    setHasTranscript(Boolean(tr.data?.length))
    if (staged) {
      setItems(staged)
      const next = {}
      for (const { kind } of FILING_KINDS) for (const row of staged[kind]) if (!isHandled(row)) next[row.id] = defaultChoice(row)
      setChoices(next)
      setEdits({})
      const fromRows = FILING_KINDS.flatMap(({ kind }) => staged[kind]).map((r) => (isSim ? r.practice_project_id : r.project_id)).find(Boolean)
      if (fromRows) setProjectId(fromRows)
    }
    if (!isSim && m.data?.project_id) setProjectId(m.data.project_id)
    setLoading(false)
  }, [client, isSim, meetingId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let live = true
    canFileMeetingItems(isSim).then((ok) => { if (live) setCanFile(ok) })
    return () => { live = false }
  }, [isSim])

  // Project picker only when the meeting has no project (and nothing is staged yet).
  const needsProject = !loading && !projectId && !readOnly
  useEffect(() => {
    if (!needsProject) return
    const q = isSim
      ? simDb.from('practice_projects').select('id, project_name').order('project_name')
      : platformDb.from('projects').select('id, project_name').eq('is_deleted', false).order('project_name')
    q.limit(200).then(({ data }) => setProjects(data || []))
  }, [needsProject, isSim])

  const pending = useMemo(() => FILING_KINDS.flatMap(({ kind }) => items[kind].filter((r) => !isHandled(r)).map((row) => ({ kind, row }))), [items])
  const handled = useMemo(() => FILING_KINDS.flatMap(({ kind }) => items[kind].filter(isHandled).map((row) => ({ kind, row }))), [items])
  const toFile = pending.filter(({ row }) => choices[row.id] && choices[row.id] !== 'later')
  const needsEnrichment = pending.some(({ row }) => !row.agent_enriched_at)
  const isDirty = Object.keys(edits).length > 0 || pending.some(({ row }) => choices[row.id] !== defaultChoice(row))
  useUnsavedChangesGuard(isDirty && !filing, 'You have meeting items you have not filed yet.')

  const runAgent = async () => {
    if (readOnly) return
    setRunning(true)
    setError('')
    try {
      const res = await runMeetingRegisterAgent({ isSim, meetingId, projectId: projectId || null, notes })
      if (res?.project_id) setProjectId(res.project_id)
      await load()
      toast.success(res?.staged ? `Found ${res.staged} item(s) in the meeting.` : 'Suggestions updated.')
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const fileSelected = async () => {
    if (readOnly) return
    setFiling(true)
    setError('')
    const results = []
    const failures = []
    for (const { kind, row } of toFile) {
      try {
        results.push(await fileMeetingItem({ isSim, kind, row, choice: choices[row.id], edits: edits[row.id] || {}, meeting, projectId }))
      } catch (e) {
        failures.push(`${itemTitle(kind, row).slice(0, 60)}: ${e.message}`)
      }
    }
    await load()
    setFiling(false)
    if (failures.length) setError(`Some items could not be filed — ${failures.join(' · ')}`)
    if (results.length) {
      const s = filingSummary(results)
      showSuccess({ recordId: s.recordId, operation: results.some((r) => r.choice === 'create') ? 'created' : 'updated', message: s.message })
    }
  }

  const setEdit = (id, patch) => setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), ...patch } }))

  if (loading) return <div className="p-6 text-sm text-gray-600 dark:text-gray-300">Loading meeting…</div>

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">File meeting to registers</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {meeting?.title || 'Meeting'}
            {meeting?.actual_start || meeting?.scheduled_start ? ` · ${new Date(meeting.actual_start || meeting.scheduled_start).toLocaleDateString()}` : ''}
          </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={runAgent} disabled={running || !projectId || (!pending.length && !handled.length && !hasTranscript && !notes.trim())}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {pending.length || handled.length ? 'Refresh AI suggestions' : 'File to registers with AI'}
          </button>
        )}
      </div>

      {canFile === false && (
        <p className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          You can view these meeting items, but your role cannot file them to the registers. Ask your Project Manager or PMO admin to file them, or to give your role use of Pending AI Reviews.
        </p>
      )}

      {needsProject && (
        <label className="block rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="mb-1 block font-medium text-gray-900 dark:text-gray-100">Which {isSim ? 'practice ' : ''}project are these outcomes for?</span>
          <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Choose a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </label>
      )}

      {!readOnly && !pending.length && !handled.length && !hasTranscript && (
        <label className="block rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="mb-1 block font-medium text-gray-900 dark:text-gray-100">This meeting has no transcript. Paste the meeting notes:</span>
          <textarea className={inputCls} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={48000}
            placeholder="Decisions, actions, risks and issues discussed…" />
        </label>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {!readOnly && needsEnrichment && pending.length > 0 && !running && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Some items have no AI suggestions yet (owner, duplicates). Use “Refresh AI suggestions” or file them as they are.
        </p>
      )}

      <fieldset disabled={readOnly} className="min-w-0 space-y-6">
      {FILING_KINDS.map(({ kind, label }) => {
        const rows = items[kind].filter((r) => !isHandled(r))
        if (!rows.length) return null
        return (
          <section key={kind} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{label} <span className="text-sm font-normal text-gray-500">({rows.length})</span></h2>
            {rows.map((row, i) => {
              const choice = choices[row.id] || 'create'
              const edit = edits[row.id] || {}
              const showDue = kind === 'action' || kind === 'issue'
              return (
                <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gray-100 px-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">#{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input className={inputCls} value={edit.title ?? itemTitle(kind, row)} onChange={(e) => setEdit(row.id, { title: e.target.value })}
                        aria-label={`${label} item ${i + 1} title`} disabled={choice !== 'create'} />
                      {row.ai_extracted_desc && <p className="text-sm text-gray-600 dark:text-gray-400">{row.ai_extracted_desc}</p>}
                      {row.source_quote && <p className="border-l-2 border-gray-300 pl-2 text-xs italic text-gray-500 dark:border-gray-600 dark:text-gray-400">“{row.source_quote}”</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {row.suggested_owner_name && (
                          <label className="inline-flex items-center gap-1">
                            <input type="checkbox" checked={edit.ownerId !== null} onChange={(e) => setEdit(row.id, { ownerId: e.target.checked ? undefined : null })} disabled={choice !== 'create'} />
                            Owner: {row.suggested_owner_name}
                          </label>
                        )}
                        {Object.entries(row.mapped_values || {}).map(([k, v]) => <span key={k}>{k}: {String(v)}</span>)}
                        {row.agent_note && <span>{row.agent_note}</span>}
                      </div>
                      {row.duplicate_of_id && (
                        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                          Possible duplicate of {row.duplicate_of_ref || 'an existing record'}{row.duplicate_title ? ` — “${row.duplicate_title}”` : ''}
                          {row.duplicate_score != null ? ` (${Math.round(Number(row.duplicate_score) * 100)}% similar)` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-56">
                      <select className={inputCls} value={choice} onChange={(e) => setChoices((c) => ({ ...c, [row.id]: e.target.value }))}
                        aria-label={`What to do with ${label.toLowerCase()} item ${i + 1}`}>
                        {['create', ...(row.duplicate_of_id ? ['update'] : []), 'reject', 'later'].map((c) => <option key={c} value={c}>{CHOICE_LABEL[c]}</option>)}
                      </select>
                      {showDue && choice === 'create' && (
                        <label className="text-xs text-gray-600 dark:text-gray-400">
                          Due date
                          <input type="date" className={inputCls} value={edit.dueDate ?? row.suggested_due_date ?? row.due_date ?? ''}
                            onChange={(e) => setEdit(row.id, { dueDate: e.target.value || null })} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
      </fieldset>

      {!readOnly && pending.length > 0 && (
        <div className="sticky bottom-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {toFile.length} of {pending.length} item(s) will be filed. Records are created as drafts for you to complete.
          </p>
          <button type="button" onClick={fileSelected} disabled={filing || !toFile.length}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {filing && <Loader2 className="h-4 w-4 animate-spin" />} File selected items
          </button>
        </div>
      )}

      {!readOnly && !pending.length && !handled.length && !running && (hasTranscript || notes.trim()) && projectId && (
        <p className="text-sm text-gray-600 dark:text-gray-400">Press “File to registers with AI” to find the actions, risks, issues and decisions in this meeting.</p>
      )}

      {handled.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100">Already filed ({handled.length})</summary>
          <ul className="mt-3 space-y-1 text-sm">
            {handled.map(({ kind, row }) => (
              <li key={row.id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                <span>{FILING_KINDS.find((k) => k.kind === kind).recordLabel}: {itemTitle(kind, row)} — <span className="text-gray-500 dark:text-gray-400">{STATUS_LABEL[row.status] || row.status}</span></span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {modal}
    </div>
  )
}
