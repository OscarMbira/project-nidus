import { simDb } from '../supabase/supabaseClient'

// --- Chat ---

export async function getMessages(projectId, limit = 100) {
  const { data, error } = await simDb
    .from('team_messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function sendMessage(projectId, senderId, message) {
  const { data, error } = await simDb
    .from('team_messages')
    .insert({ project_id: projectId, sender_id: senderId, message, message_type: 'text' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMessage(id) {
  const { error } = await simDb
    .from('team_messages')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}

export function subscribeToMessages(projectId, onMessage) {
  const channel = simDb
    .channel(`sim-team-chat-${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'sim', table: 'team_messages', filter: `project_id=eq.${projectId}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe()
  return channel
}

// --- Calls ---

export async function getCalls(projectId, callType, filters = {}) {
  let q = simDb
    .from('team_calls')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('scheduled_at', { ascending: false })

  if (callType) q = q.eq('call_type', callType)
  if (filters.status) q = q.eq('status', filters.status)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getCall(id) {
  const { data, error } = await simDb
    .from('team_calls')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createCall(payload) {
  const { data, error } = await simDb
    .from('team_calls')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCall(id, payload) {
  const { data, error } = await simDb
    .from('team_calls')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCall(id) {
  const { error } = await simDb
    .from('team_calls')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
