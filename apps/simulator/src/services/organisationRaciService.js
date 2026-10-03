/**
 * Roles & Responsibilities (default RACI) service (v982 Phase 2 — PMO Configuration Zone)
 * CRUD for public.pmo_role_responsibilities (SQL/v987_pmo_role_responsibilities_raci.sql).
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'

const TABLE = 'pmo_role_responsibilities'
const SELECT = 'id, account_id, record_type, role_name, raci_code, notes, is_active, created_by, updated_by, created_at, updated_at'

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

export async function getRoleResponsibilities(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }
    const { data, error } = await platformDb
      .from(TABLE)
      .select(SELECT)
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('record_type', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getRoleResponsibilities:', error)
    return { success: false, data: [], error: error.message || 'Failed to load role responsibilities' }
  }
}

async function currentUserRowId() {
  const { data: { user } = {} } = await platformDb.auth.getUser()
  if (!user) return null
  const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return userRow?.id || null
}

export async function createRoleResponsibility(payload) {
  try {
    const accountId = payload.account_id || (await getCurrentUserAccountId())
    if (!accountId) return { success: false, data: null, error: 'Missing organisation id' }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .insert([{
        account_id: accountId,
        record_type: (payload.record_type || '').trim(),
        role_name: (payload.role_name || '').trim(),
        raci_code: payload.raci_code || 'R',
        notes: payload.notes || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: userId,
        updated_by: userId,
      }])
      .select(SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createRoleResponsibility:', error)
    return { success: false, data: null, error: error.message || 'Failed to create RACI entry' }
  }
}

export async function updateRoleResponsibility(id, payload) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing RACI entry id' }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .update({
        record_type: (payload.record_type || '').trim(),
        role_name: (payload.role_name || '').trim(),
        raci_code: payload.raci_code || 'R',
        notes: payload.notes || null,
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
    console.error('updateRoleResponsibility:', error)
    return { success: false, data: null, error: error.message || 'Failed to update RACI entry' }
  }
}

export async function deleteRoleResponsibility(id) {
  try {
    if (!id) return { success: false, error: 'Missing RACI entry id' }
    const { error } = await platformDb
      .from(TABLE)
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteRoleResponsibility:', error)
    return { success: false, error: error.message || 'Failed to delete RACI entry' }
  }
}
