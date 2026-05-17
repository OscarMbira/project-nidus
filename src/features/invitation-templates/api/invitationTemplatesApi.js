import { platformDb } from '../../../services/supabase/supabaseClient'
import {
  DEFAULT_INVITATION_MESSAGES_BY_ROLE,
  INVITATION_TEMPLATE_ROLE_NAMES,
} from '../constants/defaultInvitationMessages'

function seedPayloadForRole(roleName) {
  const seed = DEFAULT_INVITATION_MESSAGES_BY_ROLE[roleName]
  if (!seed) return null
  return {
    role_name: roleName,
    template_label: seed.template_label,
    subject_line: seed.subject_line || null,
    message_body: seed.message_body,
    is_active: true,
  }
}

export async function getTemplatesForAccount(accountId) {
  if (!accountId) return { success: false, data: [], error: 'Missing account' }
  const { data, error } = await platformDb
    .from('invitation_message_templates')
    .select('*')
    .eq('account_id', accountId)
    .order('role_name', { ascending: true })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [], error: null }
}

/**
 * Insert any missing role rows for the account using seed defaults (idempotent).
 */
export async function ensureTemplatesForAccount(accountId, authUserId) {
  if (!accountId) return { success: false, error: 'Missing account' }
  const existing = await getTemplatesForAccount(accountId)
  if (!existing.success) return { success: false, error: existing.error }
  const have = new Set((existing.data || []).map((r) => r.role_name))
  const rows = []
  for (const roleName of INVITATION_TEMPLATE_ROLE_NAMES) {
    if (have.has(roleName)) continue
    const seed = seedPayloadForRole(roleName)
    if (!seed) continue
    rows.push({
      account_id: accountId,
      ...seed,
      created_by: authUserId || null,
      updated_by: authUserId || null,
    })
  }
  if (rows.length === 0) return { success: true, inserted: 0, error: null }
  const { error } = await platformDb.from('invitation_message_templates').insert(rows)
  if (error) return { success: false, inserted: 0, error: error.message }
  return { success: true, inserted: rows.length, error: null }
}

export async function upsertTemplate(accountId, roleName, fields, authUserId) {
  if (!accountId || !roleName) return { success: false, error: 'Missing account or role' }
  const row = {
    account_id: accountId,
    role_name: roleName,
    template_label: fields.template_label ?? null,
    subject_line: fields.subject_line ?? null,
    message_body: fields.message_body,
    is_active: fields.is_active !== false,
    created_by: authUserId || null,
    updated_by: authUserId || null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await platformDb
    .from('invitation_message_templates')
    .upsert(row, { onConflict: 'account_id,role_name' })
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data, error: null }
}

export async function toggleTemplateActive(id, isActive, authUserId) {
  if (!id) return { success: false, error: 'Missing id' }
  const { data, error } = await platformDb
    .from('invitation_message_templates')
    .update({
      is_active: !!isActive,
      updated_by: authUserId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data, error: null }
}

export async function resetTemplateToDefault(accountId, roleName, authUserId) {
  const seed = seedPayloadForRole(roleName)
  if (!seed) return { success: false, error: 'Unknown role' }
  return upsertTemplate(
    accountId,
    roleName,
    {
      template_label: seed.template_label,
      subject_line: seed.subject_line,
      message_body: seed.message_body,
      is_active: true,
    },
    authUserId,
  )
}

export async function resetAllTemplatesToDefaults(accountId, authUserId) {
  if (!accountId) return { success: false, error: 'Missing account' }
  for (const roleName of INVITATION_TEMPLATE_ROLE_NAMES) {
    const res = await resetTemplateToDefault(accountId, roleName, authUserId)
    if (!res.success) return res
  }
  return { success: true, error: null }
}
