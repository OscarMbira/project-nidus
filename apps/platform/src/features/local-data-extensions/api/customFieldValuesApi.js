import { WORKFLOW_STATUS } from '../utils/customFieldConstants'
import { serializeCustomFieldValue, deserializeCustomFieldValue } from '../utils/mapCustomFieldValue'
import { appendAudit } from './customFieldsApi'
import { projectColumn, projectIdForQuery } from '../utils/ldeProjectScope'

export async function fetchValuesForEntity(platformDb, { projectId, practiceProjectId, entityType, entityId }) {
  const ctx = { projectId, practiceProjectId }
  const col = projectColumn(ctx)
  const pid = projectIdForQuery(ctx)
  if (!pid) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from('custom_field_values')
    .select('*')
    .eq(col, pid)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function upsertFieldValue(platformDb, row, userInternalId) {
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
    updated_by: userInternalId ?? null,
  }
  const { data, error } = await platformDb
    .from('custom_field_values')
    .upsert(payload, { onConflict: 'field_definition_id,entity_type,entity_id' })
    .select('*')
    .single()
  if (error) return { success: false, error: error.message }
  await appendAudit(platformDb, {
    accountId: row.account_id,
    userInternalId,
    action: 'value_upsert',
    table: 'custom_field_values',
    entityId: data?.id,
    payload: { field_definition_id: row.field_definition_id, entity_type: row.entity_type, entity_id: row.entity_id },
  })
  return { success: true, data }
}

export async function saveValueFromRuntime(platformDb, ctx, fieldDefinition, rawValue, userInternalId) {
  const cols = serializeCustomFieldValue(fieldDefinition.field_type, rawValue)
  const row = {
    account_id: ctx.accountId,
    entity_type: ctx.entityType,
    entity_id: ctx.entityId,
    field_definition_id: fieldDefinition.id,
    ...cols,
  }
  if (ctx.practiceProjectId) row.practice_project_id = ctx.practiceProjectId
  else row.project_id = ctx.projectId
  return upsertFieldValue(platformDb, row, userInternalId)
}

/** Snapshot published exportable field values for one entity */
export async function fetchPublishedExportSnapshot(platformDb, { accountId, projectId, practiceProjectId, entityType, entityId, screenCode }) {
  const col = projectColumn({ projectId, practiceProjectId })
  const pid = projectIdForQuery({ projectId, practiceProjectId })
  if (!accountId || !pid) return { definitions: [], valuesByFieldId: {} }

  const { data: screen } = await platformDb.from('system_screens').select('id').eq('screen_code', screenCode).maybeSingle()
  if (!screen?.id) return { definitions: [], valuesByFieldId: {} }

  const { data: maps } = await platformDb.from('custom_field_screen_map').select('field_definition_id').eq('screen_id', screen.id)
  const ids = (maps || []).map((m) => m.field_definition_id).filter(Boolean)
  if (!ids.length) return { definitions: [], valuesByFieldId: {} }

  const { data: defs } = await platformDb
    .from('custom_field_definitions')
    .select('*')
    .in('id', ids)
    .eq('account_id', accountId)
    .eq('workflow_status', WORKFLOW_STATUS.PUBLISHED)
    .eq('is_deleted', false)
    .eq('include_in_export', true)
    .order('display_sort_order')

  const { data: vals } = await platformDb
    .from('custom_field_values')
    .select('*')
    .eq(col, pid)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .in('field_definition_id', ids)

  const valuesByFieldId = {}
  for (const v of vals || []) valuesByFieldId[v.field_definition_id] = v

  return { definitions: defs || [], valuesByFieldId }
}

/** Batch: export columns + cell map for many entities (same type) */
export async function fetchBatchExportForEntities(platformDb, { accountId, entityType, entityIds, screenCode, projectId, practiceProjectId }) {
  const result = { columns: [], matrix: {} }
  if (!accountId || !entityIds?.length) return result

  const { data: screen } = await platformDb.from('system_screens').select('id').eq('screen_code', screenCode).maybeSingle()
  if (!screen?.id) return result

  const { data: maps } = await platformDb.from('custom_field_screen_map').select('field_definition_id').eq('screen_id', screen.id)
  const fieldIds = [...new Set((maps || []).map((m) => m.field_definition_id).filter(Boolean))]
  if (!fieldIds.length) return result

  const { data: defs } = await platformDb
    .from('custom_field_definitions')
    .select('id, field_code, label, field_type')
    .in('id', fieldIds)
    .eq('account_id', accountId)
    .eq('workflow_status', WORKFLOW_STATUS.PUBLISHED)
    .eq('is_deleted', false)
    .eq('include_in_export', true)
    .order('display_sort_order')

  const columns = (defs || []).map((d) => ({ key: `lde_${d.field_code}`, label: `LDE: ${d.label}` }))
  const idList = entityIds.filter(Boolean)
  if (!idList.length) return { columns, matrix: {} }

  const col = projectColumn({ projectId, practiceProjectId })
  const pid = projectIdForQuery({ projectId, practiceProjectId })
  if (!pid) return { columns, matrix: {} }

  const { data: vals } = await platformDb
    .from('custom_field_values')
    .select('*')
    .eq('account_id', accountId)
    .eq(col, pid)
    .eq('entity_type', entityType)
    .in('entity_id', idList)
    .in('field_definition_id', fieldIds)

  const defById = Object.fromEntries((defs || []).map((d) => [d.id, d]))

  const matrix = {}
  for (const eid of idList) matrix[eid] = {}
  for (const v of vals || []) {
    const d = defById[v.field_definition_id]
    if (!d) continue
    const val = deserializeCustomFieldValue(d.field_type, v)
    let text = ''
    if (val == null) text = ''
    else if (Array.isArray(val)) text = val.join(', ')
    else if (typeof val === 'object') text = JSON.stringify(val)
    else text = String(val)
    matrix[v.entity_id][`lde_${d.field_code}`] = text
  }

  return { columns, matrix }
}
