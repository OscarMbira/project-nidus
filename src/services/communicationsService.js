import { platformDb } from './supabase/supabaseClient'

// ── Team Messages (Chat) ──────────────────────────────────────────────────────

export async function getMessages(projectId, limit = 100) {
  const { data, error } = await platformDb
    .from('team_messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function sendMessage(projectId, senderId, message, messageType = 'text') {
  const { data, error } = await platformDb
    .from('team_messages')
    .insert({ project_id: projectId, sender_id: senderId, message, message_type: messageType })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteMessage(id) {
  const { error } = await platformDb
    .from('team_messages')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}

export function subscribeToMessages(projectId, onMessage) {
  return platformDb
    .channel(`team_messages_${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `project_id=eq.${projectId}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe()
}

// ── Team Calls ────────────────────────────────────────────────────────────────

export async function getCalls(projectId, callType = null, filters = {}) {
  let q = platformDb
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
  const { data, error } = await platformDb
    .from('team_calls')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCall(payload) {
  const { data, error } = await platformDb
    .from('team_calls')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCall(id, payload) {
  const { data, error } = await platformDb
    .from('team_calls')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCall(id) {
  const { error } = await platformDb
    .from('team_calls')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
