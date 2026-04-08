/**
 * Platform communication channels — public.comm_channels
 */
import { platformDb } from '../supabase/supabaseClient'

async function getCurrentUserRowId() {
  const { data: userRow } = await platformDb.auth.getUser()
  if (!userRow?.user) return null
  const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', userRow.user.id).maybeSingle()
  return u?.id || null
}

export async function listChannelsForAccount(accountId) {
  const uid = await getCurrentUserRowId()
  if (!uid) return { data: [], error: new Error('Not authenticated') }

  const { data: members, error: e1 } = await platformDb.from('comm_channel_members').select('channel_id').eq('user_id', uid)
  if (e1) return { data: [], error: e1 }
  const ids = [...new Set((members || []).map((m) => m.channel_id))]
  if (!ids.length) return { data: [], error: null }

  const { data, error } = await platformDb
    .from('comm_channels')
    .select('id, channel_type, name, description, project_id, account_id, is_archived, created_at, updated_at')
    .in('id', ids)
    .eq('account_id', accountId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  return { data: data || [], error }
}

export async function getChannel(channelId) {
  const { data, error } = await platformDb.from('comm_channels').select('*').eq('id', channelId).maybeSingle()
  return { data, error }
}

export async function createChannel({ accountId, channelType, name, description, projectId, createdByUserId }) {
  const row = {
    account_id: accountId,
    channel_type: channelType,
    name: name || null,
    description: description || null,
    project_id: projectId || null,
    created_by: createdByUserId,
    is_archived: false,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await platformDb.from('comm_channels').insert(row).select().single()
  return { data, error }
}

export async function addChannelMember(channelId, userId, role = 'member') {
  const { data, error } = await platformDb
    .from('comm_channel_members')
    .insert({ channel_id: channelId, user_id: userId, role })
    .select()
    .single()
  return { data, error }
}

/** Find existing DM channel between two users (same account), or create one. */
export async function ensureDirectChannel(accountId, currentUserId, peerUserId) {
  if (currentUserId === peerUserId) return { data: null, error: new Error('Invalid peer') }

  const { data: dirs, error: e0 } = await platformDb
    .from('comm_channels')
    .select('id')
    .eq('account_id', accountId)
    .eq('channel_type', 'direct')

  if (e0) return { data: null, error: e0 }

  for (const row of dirs || []) {
    const { data: mems } = await platformDb.from('comm_channel_members').select('user_id').eq('channel_id', row.id)
    const set = new Set((mems || []).map((m) => m.user_id))
    if (set.size === 2 && set.has(currentUserId) && set.has(peerUserId)) {
      return { data: { id: row.id }, error: null }
    }
  }

  const { data: ch, error: e1 } = await createChannel({
    accountId,
    channelType: 'direct',
    name: null,
    description: null,
    projectId: null,
    createdByUserId: currentUserId,
  })
  if (e1 || !ch) return { data: null, error: e1 }

  const e2 = (await addChannelMember(ch.id, currentUserId, 'owner')).error
  if (e2) return { data: null, error: e2 }
  const e3 = (await addChannelMember(ch.id, peerUserId, 'member')).error
  if (e3) return { data: null, error: e3 }
  return { data: ch, error: null }
}

export async function archiveChannel(channelId) {
  const { error } = await platformDb
    .from('comm_channels')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', channelId)
  return { error }
}
