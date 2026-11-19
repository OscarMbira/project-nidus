/**
 * v1343 (PRD A4) — data for the new pages: My Approvals (timesheet flags, document reviews),
 * Meeting follow-ups and Approvals History. `db` is the app's client (platformDb / simDb);
 * Simulator tables mirror the Platform ones (sim.comm_meeting_action_items,
 * sim.local_register_record_signatories, sim.list_practice_project_approval_history).
 * Timesheet flags live in public only (both apps' timesheets read public tables).
 */
import { platformDb } from '@nidus/supabase'

/** Internal users.id of the signed-in user (null when signed out). */
export async function getCurrentInternalUserId(db = platformDb) {
  const { data: sessionData } = await db.auth.getSession()
  const authId = sessionData?.session?.user?.id
  if (!authId) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
  return data?.id || null
}

/**
 * Meeting action items assigned to the user (not dismissed). Platform meetings carry a project;
 * pass projectId to keep only that project's. Simulator meetings belong to runs, not projects.
 */
export async function listMyMeetingFollowUps(db, userId, { projectId = null } = {}) {
  if (!userId) return []
  const { data, error } = await db
    .from('comm_meeting_action_items')
    .select('id, description, due_date, priority, status, created_at, meeting_id, meeting:comm_meetings(id, title, scheduled_start)')
    .eq('assigned_user_id', userId)
    .neq('status', 'dismissed')
  if (error) throw error
  const rows = (data || []).map((r) => ({
    id: r.id,
    item: r.description,
    meeting: r.meeting?.title || '—',
    meetingId: r.meeting_id,
    meetingDate: r.meeting?.scheduled_start || null,
    due: r.due_date,
    priority: r.priority,
    status: r.status,
    created_at: r.created_at,
  }))
  if (!projectId) return rows
  const meetingIds = [...new Set(rows.map((r) => r.meetingId).filter(Boolean))]
  if (meetingIds.length === 0) return rows
  const { data: meetings, error: mErr } = await db.from('comm_meetings').select('id, project_id').in('id', meetingIds)
  if (mErr) return rows // the column is Platform-only; Simulator keeps every row
  const inProject = new Set((meetings || []).filter((m) => m.project_id === projectId).map((m) => m.id))
  return rows.filter((r) => inProject.has(r.meetingId))
}

/** Register sign-off slots assigned to the user, with the document they belong to. */
export async function listMyDocumentReviews(db, userId, { projectId = null } = {}) {
  if (!userId) return []
  const { data, error } = await db
    .from('local_register_record_signatories')
    .select('id, record_id, role_label, status, signing_round, slot_order, signed_at, declined_at, created_at, record:local_register_records(id, title, display_id, register_id, record_project_id)')
    .eq('assigned_user_id', userId)
  if (error) throw error
  return (data || [])
    .filter((r) => !projectId || r.record?.record_project_id === projectId)
    .map((r) => ({
      id: r.id,
      document: [r.record?.display_id, r.record?.title].filter(Boolean).join(' — ') || 'Document',
      role: r.role_label,
      status: r.status,
      round: r.signing_round,
      done: r.signed_at || r.declined_at || null,
      recordId: r.record_id,
      registerId: r.record?.register_id || null,
      created_at: r.created_at,
    }))
}

/** Flags the user raised, with the entry and reason names (public tables, both apps). */
export async function listMyTimesheetFlags(userId, { projectId = null } = {}) {
  if (!userId) return []
  let q = platformDb
    .from('timesheet_entry_flags')
    .select('id, entry_id, project_id, reason_ids, note, status, raised_at, resolved_at, resolution, created_at, entry:timesheet_entries(entry_date, hours_worked, status)')
    .eq('raised_by', userId)
  if (projectId) q = q.eq('project_id', projectId)
  const [{ data, error }, reasonsRes] = await Promise.all([
    q,
    platformDb.from('timesheet_entry_flag_reasons').select('id, name'),
  ])
  if (error) throw error
  const names = new Map((reasonsRes.data || []).map((r) => [r.id, r.name]))
  return (data || []).map((f) => ({
    id: f.id,
    entryDate: f.entry?.entry_date || null,
    hours: f.entry?.hours_worked ?? null,
    entryStatus: f.entry?.status || null,
    reasons: (f.reason_ids || []).map((id) => names.get(id)).filter(Boolean).join(', '),
    note: f.note,
    status: f.status,
    raisedAt: f.raised_at,
    resolution: f.resolution,
    created_at: f.created_at,
  }))
}

/** Decided authorisation requests for a project (SQL v1475). */
export async function listProjectApprovalHistory(db, app, projectId) {
  if (!projectId) return []
  const fn = app === 'simulator' ? 'list_practice_project_approval_history' : 'list_project_approval_history'
  const { data, error } = await db.rpc(fn, { p_project_id: projectId })
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.request_id,
    record: r.record_label,
    type: r.record_type,
    level: r.role_label || (r.approval_level ? `Level ${r.approval_level}` : ''),
    requestedBy: r.submitted_by_name,
    decidedBy: r.authoriser_name,
    decision: r.status,
    decidedAt: r.decided_at,
    justification: r.decision_notes,
    created_at: r.submitted_at,
  }))
}
