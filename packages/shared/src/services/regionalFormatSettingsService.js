/**
 * Regional & Format Settings — DB access (v1062).
 * Org config is public-only; used from Platform and Simulator via platformDb.
 */

import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '../utils/accountResolution.js'
import {
  REGIONAL_FORMAT_DEFAULTS,
  REGIONAL_FORMAT_FIELD_KEYS,
} from '../utils/regionalFormatConstants.js'
import { resolveRegionalFormatSettings } from '../utils/resolveRegionalFormatSettings.js'

async function currentUserRowId() {
  const { data: auth } = await platformDb.auth.getUser()
  const authId = auth?.user?.id
  if (!authId) return null
  const { data } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
  return data?.id || null
}

async function userHasPmoOrOwner(accountId) {
  const uid = await currentUserRowId()
  if (!uid || !accountId) return false
  const { data: roles } = await platformDb
    .from('user_roles')
    .select('roles(role_name)')
    .eq('user_id', uid)
    .eq('is_active', true)
  const names = (roles || []).map((r) => r.roles?.role_name).filter(Boolean)
  if (names.includes('pmo_admin') || names.includes('system_admin')) return true
  const { data: acct } = await platformDb
    .from('accounts')
    .select('owner_user_id')
    .eq('id', accountId)
    .maybeSingle()
  return !!(acct?.owner_user_id && acct.owner_user_id === uid)
}

/**
 * @returns {Promise<{success:boolean, accountId:string|null, canManage:boolean, error:string|null}>}
 */
export async function getRegionalFormatOrgAccess() {
  try {
    const accountId = await getCurrentUserAccountId()
    if (!accountId) return { success: true, accountId: null, canManage: false, error: null }
    const canManage = await userHasPmoOrOwner(accountId)
    return { success: true, accountId, canManage, error: null }
  } catch (e) {
    return { success: false, accountId: null, canManage: false, error: e?.message || 'Access check failed' }
  }
}

export async function getOrganisationRegionalFormatSettings(accountId) {
  if (!accountId) return { success: false, data: null, error: 'No organisation' }
  const { data, error } = await platformDb
    .from('organisation_regional_format_settings')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data: data || null, error: null }
}

export async function upsertOrganisationRegionalFormatSettings(accountId, values) {
  if (!accountId) return { success: false, data: null, error: 'No organisation' }
  const uid = await currentUserRowId()
  const payload = {
    account_id: accountId,
    updated_by: uid,
    updated_at: new Date().toISOString(),
    is_deleted: false,
  }
  for (const key of REGIONAL_FORMAT_FIELD_KEYS) {
    if (values[key] != null) payload[key] = values[key]
  }
  if (values.local_field_values != null && typeof values.local_field_values === 'object') {
    payload.local_field_values = values.local_field_values
  }
  const existing = await getOrganisationRegionalFormatSettings(accountId)
  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from('organisation_regional_format_settings')
      .update(payload)
      .eq('id', existing.data.id)
      .select('*')
      .maybeSingle()
    if (error) return { success: false, data: null, error: error.message }
    return { success: true, data, error: null }
  }
  payload.created_by = uid
  const { data, error } = await platformDb
    .from('organisation_regional_format_settings')
    .insert(payload)
    .select('*')
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data, error: null }
}

export async function getProjectRegionalFormatSettings(projectId) {
  if (!projectId) return { success: false, data: null, error: 'No project' }
  const { data, error } = await platformDb
    .from('project_regional_format_settings')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data: data || null, error: null }
}

export async function upsertProjectRegionalFormatSettings(projectId, overridePayload) {
  if (!projectId) return { success: false, data: null, error: 'No project' }
  const uid = await currentUserRowId()
  const payload = {
    project_id: projectId,
    updated_by: uid,
    updated_at: new Date().toISOString(),
    is_deleted: false,
    ...overridePayload,
  }
  const existing = await getProjectRegionalFormatSettings(projectId)
  if (existing.data?.id) {
    const { data, error } = await platformDb
      .from('project_regional_format_settings')
      .update(payload)
      .eq('id', existing.data.id)
      .select('*')
      .maybeSingle()
    if (error) return { success: false, data: null, error: error.message }
    return { success: true, data, error: null }
  }
  payload.created_by = uid
  const { data, error } = await platformDb
    .from('project_regional_format_settings')
    .insert(payload)
    .select('*')
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data, error: null }
}

/**
 * Resolve effective settings for an account (+ optional project).
 */
export async function loadResolvedRegionalFormatSettings(accountId, projectId = null) {
  const orgRes = accountId
    ? await getOrganisationRegionalFormatSettings(accountId)
    : { success: true, data: null }
  if (!orgRes.success) return { success: false, settings: resolveRegionalFormatSettings(null, null), error: orgRes.error }

  let projectRow = null
  if (projectId) {
    const pRes = await getProjectRegionalFormatSettings(projectId)
    if (!pRes.success) return { success: false, settings: resolveRegionalFormatSettings(orgRes.data, null), error: pRes.error }
    projectRow = pRes.data
  }

  return {
    success: true,
    orgRow: orgRes.data,
    projectRow,
    settings: resolveRegionalFormatSettings(orgRes.data || REGIONAL_FORMAT_DEFAULTS, projectRow),
    error: null,
  }
}

const LOCAL_FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date'])

/**
 * List active local field definitions for an account (org + optional project-only).
 * @param {string} accountId
 * @param {{ projectId?: string|null, includeProjectOnly?: boolean }} [opts]
 */
export async function listRegionalFormatLocalFields(accountId, opts = {}) {
  if (!accountId) return { success: false, data: [], error: 'No organisation' }
  const projectId = opts.projectId || null
  const includeProjectOnly = opts.includeProjectOnly !== false && !!projectId

  let query = platformDb
    .from('regional_format_local_field_definitions')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })
    .order('created_at', { ascending: true })

  if (includeProjectOnly && projectId) {
    query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
  } else {
    query = query.is('project_id', null)
  }

  const { data, error } = await query
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [], error: null }
}

/**
 * Create a local field definition (org or project-only).
 * @param {{ accountId: string, projectId?: string|null, fieldKey: string, label: string, valueType: string, defaultValue?: string|null, sortOrder?: number }} input
 */
export async function createRegionalFormatLocalField(input) {
  const accountId = input?.accountId
  if (!accountId) return { success: false, data: null, error: 'No organisation' }
  const valueType = input.valueType
  if (!LOCAL_FIELD_TYPES.has(valueType)) {
    return { success: false, data: null, error: 'Invalid value type' }
  }
  const fieldKey = String(input.fieldKey || '').trim()
  const label = String(input.label || '').trim()
  if (!fieldKey || !label) return { success: false, data: null, error: 'Label and key are required' }

  const uid = await currentUserRowId()
  const payload = {
    account_id: accountId,
    project_id: input.projectId || null,
    field_key: fieldKey,
    label,
    value_type: valueType,
    default_value: input.defaultValue != null && input.defaultValue !== ''
      ? String(input.defaultValue)
      : null,
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    is_deleted: false,
    created_by: uid,
    updated_by: uid,
  }

  const { data, error } = await platformDb
    .from('regional_format_local_field_definitions')
    .insert(payload)
    .select('*')
    .maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data, error: null }
}

/**
 * Soft-delete a local field definition.
 */
export async function softDeleteRegionalFormatLocalField(definitionId) {
  if (!definitionId) return { success: false, error: 'No definition id' }
  const uid = await currentUserRowId()
  const { error } = await platformDb
    .from('regional_format_local_field_definitions')
    .update({
      is_deleted: true,
      updated_by: uid,
      updated_at: new Date().toISOString(),
    })
    .eq('id', definitionId)
    .eq('is_deleted', false)
  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
