/**
 * Platform — comm_messages, reactions, attachments
 */
import { platformDb } from '../supabase/supabaseClient'

export async function listMessages(channelId, { limit = 50, before } = {}) {
  let q = platformDb
    .from('comm_messages')
    .select('id, channel_id, sender_id, parent_id, content, message_type, is_edited, is_deleted, metadata, created_at')
    .eq('channel_id', channelId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  return { data: (data || []).reverse(), error }
}

export async function sendMessage({ channelId, senderId, content, parentId = null, messageType = 'text', metadata = {} }) {
  const { data, error } = await platformDb
    .from('comm_messages')
    .insert({
      channel_id: channelId,
      sender_id: senderId,
      parent_id: parentId,
      content,
      message_type: messageType,
      metadata,
    })
    .select()
    .single()
  return { data, error }
}

export async function editMessage(messageId, content) {
  const { data, error } = await platformDb
    .from('comm_messages')
    .update({
      content,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single()
  return { data, error }
}

export async function softDeleteMessage(messageId) {
  const { error } = await platformDb
    .from('comm_messages')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: '' })
    .eq('id', messageId)
  return { error }
}

export async function addReaction(messageId, userId, emoji) {
  const { data, error } = await platformDb
    .from('comm_message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji })
    .select()
    .single()
  return { data, error }
}

export async function listReactionsForMessages(messageIds) {
  if (!messageIds?.length) return { data: [], error: null }
  const { data, error } = await platformDb
    .from('comm_message_reactions')
    .select('id, message_id, user_id, emoji, created_at')
    .in('message_id', messageIds)
  return { data: data || [], error }
}

export async function searchMessagesInAccount(accountId, searchTerm) {
  const { data: chs, error: e1 } = await platformDb.from('comm_channels').select('id').eq('account_id', accountId)
  if (e1) return { data: [], error: e1 }
  const channelIds = (chs || []).map((c) => c.id)
  if (!channelIds.length) return { data: [], error: null }
  const term = `%${searchTerm}%`
  const { data, error } = await platformDb
    .from('comm_messages')
    .select('id, channel_id, content, created_at')
    .in('channel_id', channelIds)
    .ilike('content', term)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100)
  return { data: data || [], error }
}
