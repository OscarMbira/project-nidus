import { platformDb } from '@nidus/supabase'

export async function resolveExternalDependencyAccountId(preferredProjectId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: userRow, error: userErr } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (userErr) throw userErr
  if (!userRow?.id) throw new Error('Could not resolve your user record')

  if (preferredProjectId) {
    const { data: project, error } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('id', preferredProjectId)
      .maybeSingle()
    if (error) throw error
    if (project?.account_id) return project.account_id
  }

  const { data: owned, error: ownedErr } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', userRow.id)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (ownedErr) throw ownedErr
  if (owned?.id) return owned.id

  const { data: membership, error: memberErr } = await platformDb
    .from('project_memberships')
    .select('projects:project_id (account_id)')
    .eq('user_id', userRow.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (memberErr) throw memberErr
  const accountId = membership?.projects?.account_id
  if (!accountId) throw new Error('No organisation found for your user')
  return accountId
}

export async function listExternalDependencyItems(accountId) {
  const { data, error } = await platformDb
    .from('external_dependency_items')
    .select('id, item_name, party_kind, created_at')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('item_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addExternalDependencyItem(accountId, name, partyKind) {
  const { data, error } = await platformDb.rpc('add_external_dependency_item', {
    p_account_id: accountId,
    p_name: name,
    p_party_kind: partyKind,
  })
  if (error) throw error
  return data
}

export async function removeExternalDependencyItem(itemId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data: userRow, error: userErr } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (userErr) throw userErr

  const { error } = await platformDb
    .from('external_dependency_items')
    .update({
      is_deleted: true,
      updated_by: userRow?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
  if (error) throw error
}
