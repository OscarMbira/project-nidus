import { simDb } from '../../supabase/supabaseClient'

export async function listMessages(channelId, opts) {
  const { limit = 50, before } = opts || {}
  let q = simDb
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
  const { data, error } = await simDb
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

export async function searchMessagesInAccount(accountId, searchTerm) {
  const { data: chs, error: e1 } = await simDb.from('comm_channels').select('id').eq('account_id', accountId)
  if (e1) return { data: [], error: e1 }
  const channelIds = (chs || []).map((c) => c.id)
  if (!channelIds.length) return { data: [], error: null }
  const term = `%${searchTerm}%`
  const { data, error } = await simDb
    .from('comm_messages')
    .select('id, channel_id, content, created_at')
    .in('channel_id', channelIds)
    .ilike('content', term)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(100)
  return { data: data || [], error }
}
