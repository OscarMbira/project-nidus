/**
 * Local Register Engine — organisation custom fields (v1311), Simulator (sim schema).
 * Thin wrappers over the SECURITY DEFINER RPCs in SQL/v1312 — the only way non-admin users
 * create or attach organisation custom fields (LDE table RLS stays PMO-admin only).
 * Identical to the Platform copy except it binds to simDb (sim.* RPCs, sim LDE tables).
 */
import { simDb } from './supabaseClient'
import { customFieldErrorMessage } from '@nidus/shared/utils/registerCustomFields'

const db = simDb

async function call(fn, params, fallback) {
  try {
    const { data, error } = await db.rpc(fn, params)
    if (error) throw error
    return { success: true, data: data ?? fallback, error: null }
  } catch (error) {
    console.error(`${fn}:`, error)
    return { success: false, data: fallback, error: customFieldErrorMessage(error) }
  }
}

/** @returns {Promise<{success, data: {fields, used, limit, can_manage}, error}>} */
export function listRegisterCustomFields(registerId, accountId) {
  return call('local_register_custom_fields', { p_register_id: registerId, p_account_id: accountId },
    { fields: [], used: 0, limit: 0, can_manage: false })
}

export function listCustomFieldLibrary(registerId, accountId) {
  return call('local_register_custom_field_library', { p_register_id: registerId, p_account_id: accountId }, [])
}

/** @returns data = {status:'created', field} | {status:'duplicate', existing} */
export function addRegisterCustomField(registerId, accountId, { label, fieldType, options = [], required = false }) {
  return call('local_register_add_custom_field', {
    p_register_id: registerId,
    p_account_id: accountId,
    p_label: label,
    p_field_type: fieldType,
    p_options: options,
    p_required: required,
  }, null)
}

export function attachRegisterCustomField(registerId, accountId, definitionId) {
  return call('local_register_attach_custom_field', {
    p_register_id: registerId,
    p_account_id: accountId,
    p_definition_id: definitionId,
  }, null)
}
