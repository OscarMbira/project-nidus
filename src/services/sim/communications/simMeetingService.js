import { simDb } from '../../supabase/supabaseClient'

function randomChannelName() {
  return `nidus-sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function listMeetingsForAccount(accountId, { simulationRunId } = {}) {
  let q = simDb.from('comm_meetings').select('*').eq('account_id', accountId).order('scheduled_start', { ascending: false }).limit(200)
  if (simulationRunId) q = q.eq('simulation_run_id', simulationRunId)
  const { data, error } = await q
  return { data: data || [], error }
}

export async function getMeeting(id) {
  const { data, error } = await simDb.from('comm_meetings').select('*').eq('id', id).maybeSingle()
  return { data, error }
}

export async function createMeeting({
  accountId,
  channelId,
  simulationRunId,
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
    simulation_run_id: simulationRunId || null,
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
  const { data, error } = await simDb.from('comm_meetings').insert(row).select().single()
  return { data, error }
}

export async function updateMeeting(meetingId, patch) {
  const { data, error } = await simDb
    .from('comm_meetings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single()
  return { data, error }
}
