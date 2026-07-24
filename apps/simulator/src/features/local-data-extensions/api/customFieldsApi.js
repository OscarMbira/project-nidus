import { WORKFLOW_STATUS } from '../utils/customFieldConstants'

/** Columns allowed on custom_field_definitions writes (excludes PostgREST noise like joined `options`). */
const DEFINITION_UPSERT_KEYS = new Set([
  'id',
  'account_id',
  'field_code',
  'label',
  'description',
  'field_type',
  'workflow_status',
  'validation_rules',
  'display_sort_order',
  'include_in_export',
  'is_sensitive',
  'field_metadata',
  'is_deleted',
])

export function pickDefinitionUpsertPayload(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const k of DEFINITION_UPSERT_KEYS) {
    if (raw[k] !== undefined) out[k] = raw[k]
  }
  return out
}

export async function fetchModules(platformDb) {
  const { data, error } = await platformDb
    .from('system_modules')
    .select('id, module_code, module_name, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function fetchScreensForModule(platformDb, moduleId) {
  const { data, error } = await platformDb
    .from('system_screens')
    .select('id, screen_code, screen_name, entity_type, route_hint')
    .eq('module_id', moduleId)
    .eq('is_active', true)
    .order('sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function listDefinitions(platformDb, accountId, { workflowStatus } = {}) {
  let q = platformDb
    .from('custom_field_definitions')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('display_sort_order')
  if (workflowStatus) q = q.eq('workflow_status', workflowStatus)
  const { data, error } = await q
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function getDefinition(platformDb, id) {
  const { data, error } = await platformDb.from('custom_field_definitions').select('*').eq('id', id).maybeSingle()
  if (error) return { success: false, error: error.message, data: null }
  return { success: true, data }
}

export async function listOptions(platformDb, fieldDefinitionId) {
  const { data, error } = await platformDb
    .from('custom_field_options')
    .select('*')
    .eq('field_definition_id', fieldDefinitionId)
    .eq('is_active', true)
    .order('sort_order')
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function upsertDefinition(platformDb, payload, userInternalId) {
  const cleaned = pickDefinitionUpsertPayload(payload)
  if (cleaned.id) {
    const { id, ...rest } = cleaned
    const row = {
      ...rest,
      updated_at: new Date().toISOString(),
      updated_by: userInternalId ?? null,
    }
    const { data, error } = await platformDb
      .from('custom_field_definitions')
      .update(row)
      .eq('id', id)
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }
  const insertRow = {
    ...cleaned,
    created_by: userInternalId ?? null,
    updated_by: userInternalId ?? null,
  }
  delete insertRow.id
  const { data, error } = await platformDb.from('custom_field_definitions').insert(insertRow).select('*').single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function setWorkflowStatus(platformDb, id, workflowStatus, userInternalId) {
  const { data, error } = await platformDb
    .from('custom_field_definitions')
    .update({
      workflow_status: workflowStatus,
      updated_at: new Date().toISOString(),
      updated_by: userInternalId ?? null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function publishDefinition(platformDb, id, userInternalId) {
  return setWorkflowStatus(platformDb, id, WORKFLOW_STATUS.PUBLISHED, userInternalId)
}

export async function replaceOptions(platformDb, fieldDefinitionId, options, userInternalId) {
  await platformDb.from('custom_field_options').delete().eq('field_definition_id', fieldDefinitionId)
  if (!options?.length) return { success: true }
  const rows = options.map((o, idx) => ({
    field_definition_id: fieldDefinitionId,
    option_value: o.option_value,
    option_label: o.option_label || o.option_value,
    sort_order: o.sort_order ?? idx,
    is_active: true,
  }))
  const { error } = await platformDb.from('custom_field_options').insert(rows)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listScreenMaps(platformDb, fieldDefinitionId) {
  const { data: maps, error } = await platformDb
    .from('custom_field_screen_map')
    .select('id, screen_id')
    .eq('field_definition_id', fieldDefinitionId)
  if (error) return { success: false, error: error.message, data: [] }
  const ids = [...new Set((maps || []).map((m) => m.screen_id).filter(Boolean))]
  if (!ids.length) return { success: true, data: [] }
  const { data: screens } = await platformDb.from('system_screens').select('id, screen_code, screen_name').in('id', ids)
  const smap = Object.fromEntries((screens || []).map((s) => [s.id, s]))
  const merged = (maps || []).map((m) => ({
    ...m,
    system_screens: smap[m.screen_id],
  }))
  return { success: true, data: merged }
}

export async function attachScreen(platformDb, fieldDefinitionId, screenId, userInternalId, accountId) {
  const { error } = await platformDb.from('custom_field_screen_map').insert({
    field_definition_id: fieldDefinitionId,
    screen_id: screenId,
  })
  if (error) return { success: false, error: error.message }
  await appendAudit(platformDb, {
    accountId,
    userInternalId,
    action: 'screen_map_attach',
    table: 'custom_field_screen_map',
    entityId: fieldDefinitionId,
    payload: { screen_id: screenId },
  })
  return { success: true }
}

export async function detachScreen(platformDb, mapRowId, userInternalId, accountId, fieldDefinitionId) {
  const { error } = await platformDb.from('custom_field_screen_map').delete().eq('id', mapRowId)
  if (error) return { success: false, error: error.message }
  await appendAudit(platformDb, {
    accountId,
    userInternalId,
    action: 'screen_map_detach',
    table: 'custom_field_screen_map',
    entityId: fieldDefinitionId,
    payload: { map_id: mapRowId },
  })
  return { success: true }
}

export async function listPublishedDefinitionsForScreen(platformDb, accountId, screenCode) {
  const { data: screen, error: e1 } = await platformDb
    .from('system_screens')
    .select('id')
    .eq('screen_code', screenCode)
    .eq('is_active', true)
    .maybeSingle()
  if (e1 || !screen) return { success: false, error: e1?.message || 'Unknown screen', data: [] }

  const { data: maps, error: e2 } = await platformDb
    .from('custom_field_screen_map')
    .select('field_definition_id')
    .eq('screen_id', screen.id)
  if (e2) return { success: false, error: e2.message, data: [] }

  const ids = (maps || []).map((m) => m.field_definition_id).filter(Boolean)
  if (!ids.length) return { success: true, data: [] }

  const { data: defs, error: e3 } = await platformDb
    .from('custom_field_definitions')
    .select('*')
    .in('id', ids)
    .eq('account_id', accountId)
    .eq('workflow_status', WORKFLOW_STATUS.PUBLISHED)
    .eq('is_deleted', false)
    .order('display_sort_order')
  if (e3) return { success: false, error: e3.message, data: [] }

  const withOptions = []
  for (const d of defs || []) {
    const optRes = await listOptions(platformDb, d.id)
    withOptions.push({ ...d, options: optRes.data || [] })
  }
  return { success: true, data: withOptions }
}

export async function appendAudit(platformDb, { accountId, userInternalId, action, table, entityId, payload }) {
  await platformDb.from('custom_field_audit_log').insert({
    account_id: accountId,
    actor_user_id: userInternalId,
    action_type: action,
    entity_table: table,
    entity_id: entityId,
    payload: payload || {},
  })
}
