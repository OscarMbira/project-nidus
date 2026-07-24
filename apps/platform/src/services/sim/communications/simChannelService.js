import { simDb } from '../../supabase/supabaseClient'

async function getCurrentUserRowId() {
  const { data: userRow } = await simDb.auth.getUser()
  if (!userRow?.user) return null
  const { data: u } = await simDb.from('users').select('id').eq('auth_user_id', userRow.user.id).maybeSingle()
  return u?.id || null
}

export async function listChannelsForAccount(accountId) {
  const uid = await getCurrentUserRowId()
  if (!uid) return { data: [], error: new Error('Not authenticated') }
  const { data: members, error: e1 } = await simDb.from('comm_channel_members').select('channel_id').eq('user_id', uid)
  if (e1) return { data: [], error: e1 }
  const ids = [...new Set((members || []).map((m) => m.channel_id))]
  if (!ids.length) return { data: [], error: null }
  const { data, error } = await simDb
    .from('comm_channels')
    .select('*')
    .in('id', ids)
    .eq('account_id', accountId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
  return { data: data || [], error }
}

export async function getChannel(channelId) {
  const { data, error } = await simDb.from('comm_channels').select('*').eq('id', channelId).maybeSingle()
  return { data, error }
}

export async function createChannel({ accountId, simulationRunId, channelType, name, description, createdByUserId }) {
  const row = {
    account_id: accountId,
    simulation_run_id: simulationRunId || null,
    channel_type: channelType,
    name: name || null,
    description: description || null,
    created_by: createdByUserId,
    is_archived: false,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await simDb.from('comm_channels').insert(row).select().single()
  return { data, error }
}

export async function addChannelMember(channelId, userId, role = 'member') {
  const { data, error } = await simDb
    .from('comm_channel_members')
    .insert({ channel_id: channelId, user_id: userId, role })
    .select()
    .single()
  return { data, error }
}

export async function ensureDirectChannel(accountId, currentUserId, peerUserId, simulationRunId = null) {
  if (currentUserId === peerUserId) return { data: null, error: new Error('Invalid peer') }
  let q = simDb.from('comm_channels').select('id').eq('account_id', accountId).eq('channel_type', 'direct')
  if (simulationRunId) q = q.eq('simulation_run_id', simulationRunId)
  else q = q.is('simulation_run_id', null)
  const { data: dirs, error: e0 } = await q
  if (e0) return { data: null, error: e0 }
  for (const row of dirs || []) {
    const { data: mems } = await simDb.from('comm_channel_members').select('user_id').eq('channel_id', row.id)
    const set = new Set((mems || []).map((m) => m.user_id))
    if (set.size === 2 && set.has(currentUserId) && set.has(peerUserId)) return { data: { id: row.id }, error: null }
  }
  const { data: ch, error: e1 } = await createChannel({
    accountId,
    simulationRunId,
    channelType: 'direct',
    name: null,
    description: null,
    createdByUserId: currentUserId,
  })
  if (e1 || !ch) return { data: null, error: e1 }
  const m1 = await addChannelMember(ch.id, currentUserId, 'owner')
  if (m1.error) return { data: null, error: m1.error }
  const m2 = await addChannelMember(ch.id, peerUserId, 'member')
  if (m2.error) return { data: null, error: m2.error }
  return { data: ch, error: null }
}
