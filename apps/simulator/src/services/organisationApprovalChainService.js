/**
 * Approval Chain Templates service (v982 Phase 2 — PMO Configuration Zone)
 * CRUD for public.pmo_approval_chain_templates + pmo_approval_chain_steps
 * (SQL/v985_pmo_approval_chain_templates.sql). Not explicitly named as a separate service in the
 * plan's task B list, but required to back "an admin page that lets a PMO Admin define reusable
 * approval-chain templates" (task A item 4 / task C's Workflows & Approval Chains card) —
 * selectable from a template governance profile via
 * pmo_industry_template_governance.required_approval_chain_template_id.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from './roleService'

const TABLE = 'pmo_approval_chain_templates'
const STEPS_TABLE = 'pmo_approval_chain_steps'
const SELECT = 'id, account_id, chain_name, description, is_active, created_by, updated_by, created_at, updated_at'
const STEP_SELECT = 'id, chain_template_id, step_order, approval_level, role_name, role_label, is_mandatory'

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

export async function getApprovalChainTemplates(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }
    const { data, error } = await platformDb
      .from(TABLE)
      .select(SELECT)
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('chain_name', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getApprovalChainTemplates:', error)
    return { success: false, data: [], error: error.message || 'Failed to load approval chain templates' }
  }
}

export async function getApprovalChainTemplateById(id) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing chain id' }
    const { data, error } = await platformDb.from(TABLE).select(SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return { success: false, data: null, error: 'Approval chain template not found' }
    const { data: steps, error: stepsError } = await platformDb
      .from(STEPS_TABLE)
      .select(STEP_SELECT)
      .eq('chain_template_id', id)
      .order('step_order', { ascending: true })
    if (stepsError) throw stepsError
    return { success: true, data: { ...data, steps: steps || [] }, error: null }
  } catch (error) {
    console.error('getApprovalChainTemplateById:', error)
    return { success: false, data: null, error: error.message || 'Failed to load approval chain template' }
  }
}

async function currentUserRowId() {
  const { data: { user } = {} } = await platformDb.auth.getUser()
  if (!user) return null
  const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return userRow?.id || null
}

async function replaceSteps(chainTemplateId, steps) {
  await platformDb.from(STEPS_TABLE).delete().eq('chain_template_id', chainTemplateId)
  const rows = (steps || [])
    .filter((s) => (s.role_name || '').trim())
    .map((s, index) => ({
      chain_template_id: chainTemplateId,
      step_order: index + 1,
      approval_level: Number(s.approval_level) || index + 1,
      role_name: s.role_name.trim(),
      role_label: s.role_label || null,
      is_mandatory: s.is_mandatory !== undefined ? s.is_mandatory : true,
    }))
  if (rows.length === 0) return { success: true, error: null }
  const { error } = await platformDb.from(STEPS_TABLE).insert(rows)
  if (error) throw error
  return { success: true, error: null }
}

export async function createApprovalChainTemplate(payload) {
  try {
    const accountId = payload.account_id || (await getCurrentUserAccountId())
    if (!accountId) return { success: false, data: null, error: 'Missing organisation id' }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .insert([{
        account_id: accountId,
        chain_name: (payload.chain_name || '').trim(),
        description: payload.description || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: userId,
        updated_by: userId,
      }])
      .select(SELECT)
      .single()
    if (error) throw error
    await replaceSteps(data.id, payload.steps)
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createApprovalChainTemplate:', error)
    return { success: false, data: null, error: error.message || 'Failed to create approval chain template' }
  }
}

export async function updateApprovalChainTemplate(id, payload) {
  try {
    if (!id) return { success: false, data: null, error: 'Missing chain id' }
    const userId = await currentUserRowId()
    const { data, error } = await platformDb
      .from(TABLE)
      .update({
        chain_name: (payload.chain_name || '').trim(),
        description: payload.description || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(SELECT)
      .single()
    if (error) throw error
    await replaceSteps(id, payload.steps)
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateApprovalChainTemplate:', error)
    return { success: false, data: null, error: error.message || 'Failed to update approval chain template' }
  }
}

export async function deleteApprovalChainTemplate(id) {
  try {
    if (!id) return { success: false, error: 'Missing chain id' }
    const { error } = await platformDb
      .from(TABLE)
      .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteApprovalChainTemplate:', error)
    return { success: false, error: error.message || 'Failed to delete approval chain template' }
  }
}
