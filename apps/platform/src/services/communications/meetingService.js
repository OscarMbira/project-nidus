/**
 * Platform — comm_meetings, participants
 */
import { platformDb } from '../supabase/supabaseClient'

function randomChannelName() {
  return `nidus-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function listMeetingsForAccount(accountId, { projectId } = {}) {
  let q = platformDb
    .from('comm_meetings')
    .select('*')
    .eq('account_id', accountId)
    .order('scheduled_start', { ascending: false, nullsFirst: false })
    .limit(200)
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  return { data: data || [], error }
}

export async function getMeeting(meetingId) {
  const { data, error } = await platformDb.from('comm_meetings').select('*').eq('id', meetingId).maybeSingle()
  return { data, error }
}

export async function createMeeting({
  accountId,
  channelId,
  projectId,
  title,
  description,
  meetingType = 'video',
  scheduledStart,
  scheduledEnd,
  organisedByUserId,
}) {
  const row = {
    account_id: accountId,
    channel_id: channelId || null,
    project_id: projectId || null,
    title,
    description: description || null,
    meeting_type: meetingType,
    status: 'scheduled',
    scheduled_start: scheduledStart || null,
    scheduled_end: scheduledEnd || null,
    agora_channel_name: randomChannelName(),
    organised_by: organisedByUserId,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await platformDb.from('comm_meetings').insert(row).select().single()
  return { data, error }
}

export async function updateMeeting(meetingId, patch) {
  const { data, error } = await platformDb
    .from('comm_meetings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single()
  return { data, error }
}

export async function startMeeting(meetingId) {
  return updateMeeting(meetingId, {
    status: 'in_progress',
    actual_start: new Date().toISOString(),
  })
}

export async function endMeeting(meetingId) {
  return updateMeeting(meetingId, {
    status: 'ended',
    actual_end: new Date().toISOString(),
  })
}

export async function upsertParticipant(meetingId, userId, patch = {}) {
  const { data, error } = await platformDb
    .from('comm_meeting_participants')
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        invite_status: patch.invite_status || 'invited',
        ...patch,
      },
      { onConflict: 'meeting_id,user_id' }
    )
    .select()
    .single()
  return { data, error }
}

export async function listParticipants(meetingId) {
  const { data, error } = await platformDb
    .from('comm_meeting_participants')
    .select('*, user:user_id(id, full_name, email)')
    .eq('meeting_id', meetingId)
  return { data: data || [], error }
}

export async function getTranscript(meetingId) {
  const { data, error } = await platformDb
    .from('comm_meeting_transcripts')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('segment_index', { ascending: true })
  return { data: data || [], error }
}

export async function getSummary(meetingId) {
  const { data, error } = await platformDb.from('comm_meeting_summaries').select('*').eq('meeting_id', meetingId).maybeSingle()
  return { data, error }
}
