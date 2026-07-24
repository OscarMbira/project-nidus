export async function listPermissions(platformDb, accountId) {
  const { data, error } = await platformDb
    .from('custom_field_permissions')
    .select('*, roles(role_name, role_display_name)')
    .eq('account_id', accountId)
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function saveFieldPermissionRow(platformDb, row) {
  let q = platformDb
    .from('custom_field_permissions')
    .select('id')
    .eq('account_id', row.account_id)
    .eq('role_id', row.role_id)
  if (row.field_definition_id) {
    q = q.eq('field_definition_id', row.field_definition_id).is('group_id', null)
  } else if (row.group_id) {
    q = q.eq('group_id', row.group_id).is('field_definition_id', null)
  } else {
    return { success: false, error: 'field_definition_id or group_id required' }
  }
  const { data: existing } = await q.maybeSingle()
  if (existing?.id) {
    const { data, error } = await platformDb
      .from('custom_field_permissions')
      .update({
        can_view: row.can_view,
        can_edit: row.can_edit,
        can_configure: row.can_configure,
        can_approve: row.can_approve,
        can_publish: row.can_publish,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const { data, error } = await platformDb.from('custom_field_permissions').insert(row).select('*').single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
