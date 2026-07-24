import { simDb } from './supabase/supabaseClient'

export async function listMeetings(practiceProjectId) {
  const { data: meetings, error: mErr } = await simDb
    .from('scrum_of_scrums_meetings')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('meeting_date', { ascending: false })
  if (mErr) throw mErr
  if (!meetings?.length) return []
  const ids = meetings.map((m) => m.id)
  const { data: updates, error: uErr } = await simDb.from('sos_team_updates').select('*').in('meeting_id', ids)
  if (uErr) throw uErr
  const byMeeting = {}
  for (const u of updates || []) {
    if (!byMeeting[u.meeting_id]) byMeeting[u.meeting_id] = []
    byMeeting[u.meeting_id].push(u)
  }
  return meetings.map((m) => ({ ...m, sos_team_updates: byMeeting[m.id] || [] }))
}

export async function createMeeting(row) {
  const { data, error } = await simDb.from('scrum_of_scrums_meetings').insert(row).select().single()
  if (error) throw error
  return data
}

export async function addTeamUpdate(row) {
  const { data, error } = await simDb.from('sos_team_updates').insert(row).select().single()
  if (error) throw error
  return data
}
