/**
 * Project Classifications service (v982 Phase 2 — PMO Configuration Zone)
 * CRUD for public.project_classifications (SQL/v983_project_classifications.sql).
 * RLS enforces per-organisation isolation (account_id must be one of the caller's
 * get_user_accounts(); writes additionally require is_pmo_admin_user()) — this service resolves
 * the caller's account for read scoping and their PMO Admin status for the "can manage" UI gate,
 * mirroring organisationCustomRoleService.js's getManageRolesAccess() pattern.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'

const TABLE = 'project_classifications'
const SELECT = 'id, account_id, classification_code, classification_name, complexity_level, description, color, is_active, created_by, updated_by, created_at, updated_at'

/**
 * Resolves the caller's account and whether they may create/edit/delete classifications
 * (pmo_admin or system_admin system role).
 * @returns {Promise<{success: boolean, accountId: string|null, canManage: boolean, error: string|null}>}
 */
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

/** @returns {Promise<{success: boolean, data: array, error: string|null}>} */
export async function getProjectClassifications(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }
    const { data, error } = await platformDb
      .from(TABLE)
      .select(SELECT)
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('classification_name', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getProjectClassifications:', error)
    return { success: false, data: [], error: error.message || 'Failed to load project classifications' }
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** @returns {Promise<{success: boolean, data: object|null, error: string|null}>} */
export async function getProjectClassificationById(id) {
  try {
    if (!id || !UUID_RE.test(id)) return { success: false, data: null, error: 'Invalid classification id' }
    const { data, error } = await platformDb.from(TABLE).select(SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return { success: false, data: null, error: 'Classification not found' }
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getProjectClassificationById:', error)
    return { success: false, data: null, error: error.message || 'Failed to load classification' }
  }
}

/** @returns {Promise<{success: boolean, data: object|null, error: string|null}>} */
export async function createProjectClassification(payload) {
  try {
    const accountId = payload.account_id || (await getCurrentUserAccountId())
    if (!accountId) return { success: false, data: null, error: 'Missing organisation id' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    const { data: userRow } = user
      ? await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      : { data: null }

    const { data, error } = await platformDb
      .from(TABLE)
      .insert([{
        account_id: accountId,
        classification_code: (payload.classification_code || '').toUpperCase().trim(),
        classification_name: (payload.classification_name || '').trim(),
        complexity_level: payload.complexity_level || 'medium',
        description: payload.description || null,
        color: payload.color || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: userRow?.id || null,
        updated_by: userRow?.id || null,
      }])
      .select(SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createProjectClassification:', error)
    return { success: false, data: null, error: error.message || 'Failed to create classification' }
  }
}

/** @returns {Promise<{success: boolean, data: object|null, error: string|null}>} */
export async function updateProjectClassification(id, payload) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing classification id' }
    const { data: { user } = {} } = await platformDb.auth.getUser()
    const { data: userRow } = user
      ? await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      : { data: null }

    const { data, error } = await platformDb
      .from(TABLE)
      .update({
        classification_code: (payload.classification_code || '').toUpperCase().trim(),
        classification_name: (payload.classification_name || '').trim(),
        complexity_level: payload.complexity_level || 'medium',
        description: payload.description || null,
        color: payload.color || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        updated_by: userRow?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateProjectClassification:', error)
    return { success: false, data: null, error: error.message || 'Failed to update classification' }
  }
}

/** @returns {Promise<{success: boolean, error: string|null}>} */
export async function deleteProjectClassification(id) {
  try {
    if (!id) return { success: false, error: 'Missing classification id' }
    const { error } = await platformDb
      .from(TABLE)
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteProjectClassification:', error)
    return { success: false, error: error.message || 'Failed to delete classification' }
  }
}
