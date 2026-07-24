import { WORKFLOW_STATUS } from '../utils/customFieldConstants'
import { serializeCustomFieldValue } from '../utils/mapCustomFieldValue'
import { projectColumn, projectIdForQuery } from '../utils/ldeProjectScope'

export async function upsertGroup(platformDb, payload, userInternalId) {
  if (payload.id) {
    const { id, ...rest } = payload
    const { data, error } = await platformDb
      .from('custom_field_groups')
      .update({
        ...rest,
        updated_at: new Date().toISOString(),
        updated_by: userInternalId ?? null,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const insert = {
    ...payload,
    created_by: userInternalId ?? null,
    updated_by: userInternalId ?? null,
  }
  delete insert.id
  const { data, error } = await platformDb.from('custom_field_groups').insert(insert).select('*').single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function listGroups(platformDb, accountId) {
  const { data, error } = await platformDb
    .from('custom_field_groups')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('display_sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function listGroupFields(platformDb, groupId) {
  const { data: links, error } = await platformDb
    .from('custom_field_group_fields')
    .select('field_definition_id, sort_order')
    .eq('group_id', groupId)
    .order('sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  const ids = [...new Set((links || []).map((l) => l.field_definition_id).filter(Boolean))]
  if (!ids.length) return { success: true, data: [] }
  const { data: defs, error: e2 } = await platformDb.from('custom_field_definitions').select('*').in('id', ids)
  if (e2) return { success: false, error: e2.message, data: [] }
  const defMap = Object.fromEntries((defs || []).map((d) => [d.id, d]))
  const merged = (links || []).map((l) => ({
    ...l,
    custom_field_definitions: defMap[l.field_definition_id],
  }))
  return { success: true, data: merged }
}

export async function listPublishedGroupsForScreen(platformDb, accountId, screenCode) {
  const { data: screen } = await platformDb.from('system_screens').select('id').eq('screen_code', screenCode).maybeSingle()
  if (!screen?.id) return { success: true, data: [] }

  const { data: maps } = await platformDb.from('custom_field_group_screen_map').select('group_id').eq('screen_id', screen.id)
  const gids = [...new Set((maps || []).map((m) => m.group_id).filter(Boolean))]
  if (!gids.length) return { success: true, data: [] }

  const { data: groups, error } = await platformDb
    .from('custom_field_groups')
    .select('*')
    .in('id', gids)
    .eq('account_id', accountId)
    .eq('workflow_status', WORKFLOW_STATUS.PUBLISHED)
    .eq('is_deleted', false)

  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: groups || [] }
}

export async function listInstances(platformDb, { projectId, practiceProjectId, groupId, entityType, entityId }) {
  const col = projectColumn({ projectId, practiceProjectId })
  const pid = projectIdForQuery({ projectId, practiceProjectId })
  if (!pid) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from('custom_field_group_instances')
    .select('*')
    .eq(col, pid)
    .eq('group_id', groupId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('row_sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function listInstanceValues(platformDb, instanceId) {
  const { data, error } = await platformDb
    .from('custom_field_group_values')
    .select('*')
    .eq('group_instance_id', instanceId)
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function createInstance(platformDb, row, userInternalId) {
  void userInternalId
  const { data, error } = await platformDb.from('custom_field_group_instances').insert(row).select('*').single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteInstance(platformDb, instanceId) {
  const { error } = await platformDb.from('custom_field_group_instances').delete().eq('id', instanceId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function upsertGroupCell(platformDb, { group_instance_id, field_definition_id, field_type, raw_value }) {
  const cols = serializeCustomFieldValue(field_type, raw_value)
  const { data, error } = await platformDb
    .from('custom_field_group_values')
    .upsert(
      {
        group_instance_id,
        field_definition_id,
        ...cols,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'group_instance_id,field_definition_id' }
    )
    .select('*')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
