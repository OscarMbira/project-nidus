/**
 * Organisation Authorities service (v982 Phase 2 — PMO Configuration Zone)
 * CRUD for public.organisation_authorities (SQL/v986_organisation_authorities.sql) — generalised
 * delegated authority / approval threshold / escalation definitions, parallel to (not replacing)
 * expenseClaimService.js's expense_approval_thresholds (decision 2).
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'

const TABLE = 'organisation_authorities'
const SELECT = 'id, account_id, authority_name, authority_type, min_amount, max_amount, currency, required_approval_level, delegated_role_name, escalation_role_name, escalation_after_days, description, is_active, created_by, updated_by, created_at, updated_at'

export async function getPmoConfigAccess() {
  try {
    const [accountId, { data: { user } = {} }] = await Promise.all([
      getCurrentUserAccountId(),
      platformDb.auth.getUser(),
    ])
    if (!accountId) return { success: true, accountId: null, canManage: false, error: null }
    if (!user) return { success: true, accountId, canManage: false, error: null }
    const rolesRes = await getUserSystemRoles(user.id)
    const roleNames = (rolesRes?.data || []).map((r) => r.roles?.role_name).filter(Boolean)
    const canManage = roleNames.includes('pmo_admin') || roleNames.includes('system_admin')
    return { success: true, accountId, canManage, error: null }
  } catch (error) {
    console.error('getPmoConfigAccess:', error)
    return { success: false, accountId: null, canManage: false, error: error.message || 'Failed to check access' }
  }
}

export async function getOrganisationAuthorities(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }
    const { data, error } = await platformDb
      .from(TABLE)
      .select(SELECT)
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('authority_name', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getOrganisationAuthorities:', error)
    return { success: false, data: [], error: error.message || 'Failed to load authorities' }
  }
}

export async function getOrganisationAuthorityById(id) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing authority id' }
    const { data, error } = await platformDb.from(TABLE).select(SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return { success: false, data: null, error: 'Authority not found' }
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getOrganisationAuthorityById:', error)
    return { success: false, data: null, error: error.message || 'Failed to load authority' }
  }
}

async function currentUserRowId() {
  const { data: { user } = {} } = await platformDb.auth.getUser()
  if (!user) return null
  const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return userRow?.id || null
}

export async function createOrganisationAuthority(payload) {
  try {
    const accountId = payload.account_id || (await getCurrentUserAccountId())
    if (!accountId) return { success: false, data: null, error: 'Missing organisation id' }
    if (payload.max_amount !== null && payload.max_amount !== '' && payload.max_amount !== undefined && Number(payload.max_amount) < Number(payload.min_amount || 0)) {
      return { success: false, data: null, error: 'Maximum amount must be greater than or equal to minimum amount' }
    }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .insert([{
        account_id: accountId,
        authority_name: (payload.authority_name || '').trim(),
        authority_type: payload.authority_type || 'general',
        min_amount: Number(payload.min_amount) || 0,
        max_amount: payload.max_amount === '' || payload.max_amount === null || payload.max_amount === undefined ? null : Number(payload.max_amount),
        currency: payload.currency || 'USD',
        required_approval_level: Number(payload.required_approval_level) || 1,
        delegated_role_name: payload.delegated_role_name || null,
        escalation_role_name: payload.escalation_role_name || null,
        escalation_after_days: payload.escalation_after_days === '' || payload.escalation_after_days === null || payload.escalation_after_days === undefined ? null : Number(payload.escalation_after_days),
        description: payload.description || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: userId,
        updated_by: userId,
      }])
      .select(SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createOrganisationAuthority:', error)
    return { success: false, data: null, error: error.message || 'Failed to create authority' }
  }
}

export async function updateOrganisationAuthority(id, payload) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing authority id' }
    if (payload.max_amount !== null && payload.max_amount !== '' && payload.max_amount !== undefined && Number(payload.max_amount) < Number(payload.min_amount || 0)) {
      return { success: false, data: null, error: 'Maximum amount must be greater than or equal to minimum amount' }
    }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .update({
        authority_name: (payload.authority_name || '').trim(),
        authority_type: payload.authority_type || 'general',
        min_amount: Number(payload.min_amount) || 0,
        max_amount: payload.max_amount === '' || payload.max_amount === null || payload.max_amount === undefined ? null : Number(payload.max_amount),
        currency: payload.currency || 'USD',
        required_approval_level: Number(payload.required_approval_level) || 1,
        delegated_role_name: payload.delegated_role_name || null,
        escalation_role_name: payload.escalation_role_name || null,
        escalation_after_days: payload.escalation_after_days === '' || payload.escalation_after_days === null || payload.escalation_after_days === undefined ? null : Number(payload.escalation_after_days),
        description: payload.description || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateOrganisationAuthority:', error)
    return { success: false, data: null, error: error.message || 'Failed to update authority' }
  }
}

export async function deleteOrganisationAuthority(id) {
  try {
    if (!id) return { success: false, error: 'Missing authority id' }
    const { error } = await platformDb
      .from(TABLE)
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteOrganisationAuthority:', error)
    return { success: false, error: error.message || 'Failed to delete authority' }
  }
}
