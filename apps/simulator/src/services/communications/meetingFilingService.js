/**
 * v1272 Phase 2 — Meeting-to-Register filing (PRD D13, stories 29–31, 35). Platform and Simulator
 * share this file (identical copy in each app); `isSim` picks the schema.
 *
 *   runMeetingRegisterAgent  → edge function meeting-register-agent: stages and enriches items
 *   loadStagedItems          → the meeting's actions, risks, issues and decisions
 *   fileMeetingItem          → the person's choice for one item:
 *        'create' → a DRAFT record (risk/issue 'draft', decision 'proposed', open daily-log action)
 *        'update' → the meeting note + quote added to the existing record (no field is changed)
 *        'reject' → the item is set aside
 * The agent itself never writes register records; only this person-driven step does.
 */
import { platformDb } from '../supabase/supabaseClient'
import { simDb } from '@nidus/supabase'
import { approveAndCreateIssue, approveAndCreateRisk } from './meetingExtractionService'
import { approveAndCreatePracticeIssue, approveAndCreatePracticeRisk } from '../sim/communications/simMeetingExtractionService'
import { createDecision } from '../decisionLogService'
import { createDecision as createSimDecision } from '../sim/simDecisionService'
import { addEntry } from '../dailyLogEntryService'
import { createDailyLog, getDailyLogByProject } from '../dailyLogService'
import { createPracticeDailyLog, createPracticeDailyLogEntry, getPracticeDailyLog } from '../sim/practiceDailyLogService'

export const FILING_KINDS = [
  { kind: 'action', label: 'Actions', table: 'comm_meeting_action_items', entity: 'actions', recordLabel: 'action' },
  { kind: 'risk', label: 'Risks', table: 'comm_meeting_extracted_risks', entity: 'risks', recordLabel: 'risk' },
  { kind: 'issue', label: 'Issues', table: 'comm_meeting_extracted_issues', entity: 'issues', recordLabel: 'issue' },
  { kind: 'decision', label: 'Decisions', table: 'comm_meeting_extracted_decisions', entity: 'decisions', recordLabel: 'decision' },
]
const BY_KIND = Object.fromEntries(FILING_KINDS.map((k) => [k.kind, k]))
const HANDLED = new Set(['created', 'merged', 'rejected', 'dismissed', 'converted_to_task', 'completed'])

export const isHandled = (row) => HANDLED.has(row?.status)
export const itemTitle = (kind, row) => (kind === 'action' ? row.description : row.ai_extracted_title) || ''

/** Default choice for a staged item: add to the existing record when the agent found a duplicate. */
export function defaultChoice(row) {
  return row?.duplicate_of_id ? 'update' : 'create'
}

const db = (isSim) => (isSim ? simDb : platformDb)

export async function runMeetingRegisterAgent({ isSim, meetingId, projectId = null, notes = '' }) {
  const { data, error } = await platformDb.functions.invoke('meeting-register-agent', {
    body: { app: isSim ? 'simulator' : 'platform', meeting_id: meetingId, project_id: projectId, notes: notes || undefined },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* keep the generic message */
    }
    throw new Error(message || 'The meeting could not be filed. Please try again.')
  }
  return data
}

export async function loadStagedItems(isSim, meetingId) {
  const client = db(isSim)
  const results = await Promise.all(FILING_KINDS.map(({ table }) =>
    client.from(table).select('*').eq('meeting_id', meetingId).order('created_at', { ascending: true })))
  const firstError = results.find((r) => r.error)?.error
  if (firstError) throw firstError
  return Object.fromEntries(FILING_KINDS.map(({ kind }, i) => [kind, results[i].data || []]))
}

async function currentUserId() {
  const { data: auth } = await platformDb.auth.getUser()
  if (!auth?.user) throw new Error('Please sign in again.')
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
  return data?.id || null
}

async function displayIdOf(isSim, entity, id) {
  if (!id) return null
  const { data } = await db(isSim).from(`ai_v_${entity}`).select('display_id').eq('id', id).maybeSingle()
  return data?.display_id || null
}

async function setStaging(isSim, kind, id, patch) {
  const { error } = await db(isSim).from(BY_KIND[kind].table)
    .update({ ...patch, reviewed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

const projectOf = (isSim, row, fallback) => (isSim ? row.practice_project_id : row.project_id) || fallback

async function createDraft({ isSim, kind, row, edits, meeting, projectId }) {
  const title = (edits.title ?? itemTitle(kind, row)).trim()
  const owner = edits.ownerId === undefined ? row.suggested_owner_id : edits.ownerId
  const due = edits.dueDate ?? row.suggested_due_date ?? row.due_date ?? null
  const mapped = row.mapped_values || {}
  const pid = projectOf(isSim, row, projectId)
  const reviewer = await currentUserId()

  if (kind === 'risk') {
    const source = { ...row, ai_extracted_title: title, suggested_category: mapped.category || row.suggested_category }
    const created = isSim
      ? await approveAndCreatePracticeRisk(source, { ownerUserId: owner })
      : await approveAndCreateRisk(source, { ownerUserId: owner })
    return { id: created.id }
  }
  if (kind === 'issue') {
    const source = { ...row, ai_extracted_title: title, suggested_category: mapped.category || row.suggested_category }
    const opts = { ownerUserId: owner, dueDate: due, priority: mapped.priority || row.suggested_priority }
    const created = isSim ? await approveAndCreatePracticeIssue(source, opts) : await approveAndCreateIssue(source, opts)
    return { id: created.id }
  }
  if (kind === 'decision') {
    const payload = {
      project_id: pid,
      decision_title: title,
      description: row.ai_extracted_desc || null,
      rationale: row.rationale || null,
      status: 'proposed', // the decision log's pre-approval state
      decision_date: String(meeting?.actual_start || meeting?.scheduled_start || new Date().toISOString()).slice(0, 10),
      decided_by_name: row.made_by_name || null,
      ...(mapped.category ? { category: mapped.category } : {}),
      ...(['low', 'medium', 'high', 'critical'].includes(String(mapped.priority || '').toLowerCase()) ? { priority: String(mapped.priority).toLowerCase() } : {}),
    }
    const created = isSim ? await createSimDecision(payload) : await createDecision(payload)
    await setStaging(isSim, kind, row.id, { status: 'created', decision_id: created.id, reviewed_by: reviewer })
    return { id: created.id }
  }
  // action → an open action in the project's daily log
  const priority = ['low', 'medium', 'high'].includes(String(mapped.priority || row.priority || '').toLowerCase())
    ? String(mapped.priority || row.priority).toLowerCase() : null
  let entry
  if (isSim) {
    let log = (await getPracticeDailyLog(pid)).data
    if (!log) log = (await createPracticeDailyLog(pid, {})).data
    if (!log) throw new Error('The practice daily log could not be opened.')
    const res = await createPracticeDailyLogEntry(log.id, { entry_type: 'action', description: title, target_date: due, priority, status: 'open' })
    if (!res.success) throw new Error(res.error)
    entry = res.data
  } else {
    let log = (await getDailyLogByProject(pid))?.data
    if (!log) log = (await createDailyLog(pid))?.data
    if (!log) throw new Error('The project daily log could not be opened.')
    const ownerName = owner === row.suggested_owner_id ? row.suggested_owner_name : null
    const res = await addEntry(log.id, {
      entry_type: 'action', description: title, person_responsible_id: owner || null,
      person_responsible_name: ownerName || row.assigned_to_name || null, target_date: due, priority, status: 'open',
    })
    if (!res.success) throw new Error(res.error)
    entry = res.data
  }
  await setStaging(isSim, kind, row.id, { status: 'created', daily_log_entry_id: entry.id, reviewed_by: reviewer })
  return { id: entry.id }
}

async function addUpdateToExisting({ isSim, kind, row, meeting }) {
  const recordId = row.duplicate_of_id
  if (!recordId) throw new Error('No existing record to update.')
  const userId = await currentUserId()
  const when = String(meeting?.actual_start || meeting?.scheduled_start || '').slice(0, 10)
  const note = `Raised again in meeting "${meeting?.title || 'meeting'}"${when ? ` on ${when}` : ''}: ${itemTitle(kind, row)}`
    + (row.ai_extracted_desc ? ` — ${row.ai_extracted_desc}` : '')
  const client = db(isSim)
  const { error } = await client.from('comm_meeting_record_updates').insert({
    meeting_id: row.meeting_id, entity_type: kind, record_id: recordId, record_ref: row.duplicate_of_ref || null,
    note: note.slice(0, 4000), source_quote: row.source_quote || null, created_by: userId,
  })
  if (error) throw error
  // Platform risks and issues also get a comment, so the note shows on the record itself.
  if (!isSim && userId && (kind === 'risk' || kind === 'issue')) {
    const text = `${note}${row.source_quote ? `\nQuote: "${row.source_quote}"` : ''}`.slice(0, 4000)
    const insert = kind === 'risk'
      ? platformDb.from('risk_comments').insert({ risk_id: recordId, comment_text: text, commented_by: userId })
      : platformDb.from('issue_comments').insert({ issue_id: recordId, user_id: userId, comment_text: text, comment_type: 'comment', created_by: userId })
    const { error: commentError } = await insert
    if (commentError) console.warn('[meeting filing] comment not added', commentError.message)
  }
  await setStaging(isSim, kind, row.id, { status: 'merged', reviewed_by: userId })
  return { id: recordId, ref: row.duplicate_of_ref || null }
}

/**
 * File one staged item. Returns { kind, choice, id, displayId, title }.
 * @param {object} args { isSim, kind, row, choice: 'create'|'update'|'reject', edits, meeting, projectId }
 */
export async function fileMeetingItem({ isSim, kind, row, choice, edits = {}, meeting = null, projectId = null }) {
  const title = (edits.title ?? itemTitle(kind, row)).trim()
  if (choice === 'reject') {
    await setStaging(isSim, kind, row.id, { status: kind === 'action' ? 'dismissed' : 'rejected', reviewed_by: await currentUserId() })
    return { kind, choice, id: null, displayId: null, title }
  }
  if (choice === 'update') {
    const res = await addUpdateToExisting({ isSim, kind, row, meeting })
    return { kind, choice, id: res.id, displayId: res.ref, title }
  }
  if (!title) throw new Error('Give the item a title first.')
  const res = await createDraft({ isSim, kind, row, edits, meeting, projectId })
  const displayId = await displayIdOf(isSim, BY_KIND[kind].entity, res.id)
  return { kind, choice, id: res.id, displayId, title }
}

/** Success-modal text for a batch of filed items. */
export function filingSummary(results) {
  const created = results.filter((r) => r.choice === 'create')
  const updated = results.filter((r) => r.choice === 'update')
  const rejected = results.filter((r) => r.choice === 'reject')
  const ids = created.map((r) => r.displayId || r.title).filter(Boolean)
  const parts = []
  if (created.length) parts.push(`${created.length} draft record${created.length === 1 ? '' : 's'} created`)
  if (updated.length) parts.push(`${updated.length} existing record${updated.length === 1 ? '' : 's'} updated (${updated.map((r) => r.displayId).filter(Boolean).join(', ') || 'notes added'})`)
  if (rejected.length) parts.push(`${rejected.length} set aside`)
  return { recordId: ids.join(', ') || null, message: `${parts.join('; ')}. Drafts stay in their registers until you complete and submit them.` }
}
