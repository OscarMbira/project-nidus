import { platformDb } from './supabase/supabaseClient'

export async function listMeetings(projectId) {
  const { data: meetings, error: mErr } = await platformDb
    .from('scrum_of_scrums_meetings')
    .select('*')
    .eq('project_id', projectId)
    .order('meeting_date', { ascending: false })
  if (mErr) throw mErr
  if (!meetings?.length) return []
  const ids = meetings.map((m) => m.id)
  const { data: updates, error: uErr } = await platformDb
    .from('sos_team_updates')
    .select('*')
    .in('meeting_id', ids)
  if (uErr) throw uErr
  const byMeeting = {}
  for (const u of updates || []) {
    if (!byMeeting[u.meeting_id]) byMeeting[u.meeting_id] = []
    byMeeting[u.meeting_id].push(u)
  }
  return meetings.map((m) => ({ ...m, sos_team_updates: byMeeting[m.id] || [] }))
}

export async function createMeeting(row) {
  const { data, error } = await platformDb.from('scrum_of_scrums_meetings').insert(row).select().single()
  if (error) throw error
  return data
}

export async function addTeamUpdate(row) {
  const { data, error } = await platformDb.from('sos_team_updates').insert(row).select().single()
  if (error) throw error
  return data
}
