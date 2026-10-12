/**
 * Local Register Engine — register definitions (v931/v932).
 * Covers both system-defined registers (the 28 industry capability registers, seeded by
 * SQL/v933_local_registers_system_seed.sql) and member-created local registers. System-defined
 * registers carry no account_id — they're visible to any account whose enabled industry packs
 * match via local_register_industry_packs (SQL/v932_local_registers_system_scope_fix.sql), not
 * by account ownership. RLS is the actual write gate — the client-side is_system_defined guards
 * below are a UX convenience, not the security boundary (rule 42).
 */

import { supabase } from './supabaseClient'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'

/**
 * Resolve a `local_registers` row from either its UUID or its `register_key` (rule 16.3 —
 * friendly URLs even without Admin ID Generation). `register_key` has no DB-level unique
 * constraint, so a key lookup is scoped to system-defined registers first (the common case —
 * industry taxonomy registers, whose keys are unique by construction across the seed data), then
 * to the caller's own account (member-created registers) — never returns another account's
 * register on a name collision.
 * @param {string} registerKeyOrId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getRegisterDefinition(registerKeyOrId) {
  if (!registerKeyOrId) return { success: true, data: null, error: null }
  try {
    let registerRow = null

    if (isLikelyDatabaseUuid(registerKeyOrId)) {
      const { data, error } = await supabase
        .from('local_registers')
        .select('*')
        .eq('id', registerKeyOrId)
        .maybeSingle()
      if (error) throw error
      registerRow = data
    } else {
      const { data: systemRow, error: systemErr } = await supabase
        .from('local_registers')
        .select('*')
        .eq('register_key', registerKeyOrId)
        .eq('is_system_defined', true)
        .limit(1)
        .maybeSingle()
      if (systemErr) throw systemErr
      registerRow = systemRow

      if (!registerRow) {
        const accountId = await getCurrentUserAccountId()
        if (accountId) {
          const { data: ownRow, error: ownErr } = await supabase
            .from('local_registers')
            .select('*')
            .eq('register_key', registerKeyOrId)
            .eq('account_id', accountId)
            .limit(1)
            .maybeSingle()
          if (ownErr) throw ownErr
          registerRow = ownRow
        }
      }
    }

    if (!registerRow) return { success: true, data: null, error: null }

    const { data: fieldsData, error: fieldsError } = await supabase
      .from('local_register_fields')
      .select('*')
      .eq('register_id', registerRow.id)
      .order('display_order', { ascending: true })
    if (fieldsError) throw fieldsError

    return {
      success: true,
      data: { ...registerRow, fields: fieldsData || [] },
      error: null,
    }
  } catch (error) {
    console.error('getRegisterDefinition:', error)
    return { success: false, data: null, error: error.message || 'Failed to load register definition' }
  }
}

/**
 * Industry pack ids this account currently has enabled (its selected industries + the
 * always-on Cross-Industry/Generic PM pack) — v932's system-defined registers are visible only
 * through this, not through account_id (they have none). Mirrors the same
 * account_industries -> Cross-Industry-union -> industry_packs resolution
 * organisationIndustryService.js's getOrgCapabilities()/getMenuItemIndustryPackMap() already use
 * (rule 66 — same query shape, not a new one, kept local here to avoid a cross-service import
 * for one small lookup).
 * @param {string} accountId
 * @returns {Promise<string[]>}
 */
async function getEnabledIndustryPackIds(accountId) {
  if (!accountId) return []
  const [industriesRes, crossIndustryRes] = await Promise.all([
    supabase.from('account_industries').select('industry_category_id').eq('account_id', accountId),
    supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
  ])
  const industryCategoryIds = new Set((industriesRes.data || []).map((r) => r.industry_category_id))
  if (crossIndustryRes.data?.id) industryCategoryIds.add(crossIndustryRes.data.id)
  if (industryCategoryIds.size === 0) return []

  const { data: packs } = await supabase
    .from('industry_packs')
    .select('id')
    .in('industry_category_id', Array.from(industryCategoryIds))
    .eq('is_active', true)
  return (packs || []).map((p) => p.id)
}

/**
 * Registers visible at a given scope — system-defined ones whose local_register_industry_packs
 * link matches one of the account's enabled industry packs, plus any local registers created at
 * this scope entity by an account member.
 * @param {{ scopeLevel: 'pmo'|'portfolio'|'programme'|'project', scopeEntityId?: string, accountId: string }} params
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listRegistersForScope({ scopeLevel, scopeEntityId, accountId }) {
  if (!accountId || !scopeLevel) return { success: true, data: [], error: null }
  try {
    const packIds = await getEnabledIndustryPackIds(accountId)

    let localQuery = supabase
      .from('local_registers')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .eq('scope_level', scopeLevel)
    if (scopeLevel === 'portfolio') localQuery = localQuery.eq('scope_portfolio_id', scopeEntityId)
    else if (scopeLevel === 'programme') localQuery = localQuery.eq('scope_programme_id', scopeEntityId)
    else if (scopeLevel === 'project') localQuery = localQuery.eq('scope_project_id', scopeEntityId)

    const queries = [localQuery]
    if (packIds.length > 0) {
      queries.push(
        supabase
          .from('local_registers')
          .select('*, local_register_industry_packs!inner(industry_pack_id)')
          .eq('is_active', true)
          .eq('scope_level', scopeLevel)
          .eq('is_system_defined', true)
          .in('local_register_industry_packs.industry_pack_id', packIds)
      )
    }

    const results = await Promise.all(queries)
    const failed = results.find((r) => r.error)
    if (failed) throw failed.error

    const combined = results.flatMap((r) => r.data || [])
    const deduped = Array.from(new Map(combined.map((r) => [r.id, r])).values())
    deduped.sort((a, b) => a.label.localeCompare(b.label))

    return { success: true, data: deduped, error: null }
  } catch (error) {
    console.error('listRegistersForScope:', error)
    return { success: false, data: [], error: error.message || 'Failed to load registers' }
  }
}

/**
 * Every register visible to an account, regardless of scope — the pmo-cat-admin oversight view
 * (PRD decision 5): the account's own member-created registers, plus every system-defined
 * register matching its enabled industry packs. Includes inactive local registers so an admin
 * can reactivate one.
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listAllRegistersForAccount(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const packIds = await getEnabledIndustryPackIds(accountId)

    const queries = [supabase.from('local_registers').select('*').eq('account_id', accountId)]
    if (packIds.length > 0) {
      queries.push(
        supabase
          .from('local_registers')
          .select('*, local_register_industry_packs!inner(industry_pack_id)')
          .eq('is_system_defined', true)
          .in('local_register_industry_packs.industry_pack_id', packIds)
      )
    }

    const results = await Promise.all(queries)
    const failed = results.find((r) => r.error)
    if (failed) throw failed.error

    const combined = results.flatMap((r) => r.data || [])
    const deduped = Array.from(new Map(combined.map((r) => [r.id, r])).values())
    deduped.sort((a, b) => (b.is_system_defined ? 1 : 0) - (a.is_system_defined ? 1 : 0) || a.label.localeCompare(b.label))

    return { success: true, data: deduped, error: null }
  } catch (error) {
    console.error('listAllRegistersForAccount:', error)
    return { success: false, data: [], error: error.message || 'Failed to load registers' }
  }
}

/**
 * @param {{ registerKey: string, label: string, icon?: string, description?: string,
 *   scopeLevel: string, scopePortfolioId?: string, scopeProgrammeId?: string,
 *   scopeProjectId?: string, accountId: string, statusWorkflow: Array<{key:string,label:string}>,
 *   fields: Array<{fieldKey:string, fieldLabel:string, fieldType:string, isRequired?:boolean,
 *   displayOrder?:number, dropdownOptions?:array}> }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createRegisterDefinition(params) {
  try {
    const { data: registerRow, error: registerError } = await supabase
      .from('local_registers')
      .insert({
        register_key: params.registerKey,
        label: params.label,
        icon: params.icon || null,
        description: params.description || null,
        scope_level: params.scopeLevel,
        scope_portfolio_id: params.scopePortfolioId || null,
        scope_programme_id: params.scopeProgrammeId || null,
        scope_project_id: params.scopeProjectId || null,
        account_id: params.accountId,
        status_workflow: params.statusWorkflow || [],
        is_system_defined: false,
      })
      .select()
      .single()
    if (registerError) throw registerError

    const fields = params.fields || []
    if (fields.length > 0) {
      const { error: fieldsError } = await supabase.from('local_register_fields').insert(
        fields.map((f, index) => ({
          register_id: registerRow.id,
          field_key: f.fieldKey,
          field_label: f.fieldLabel,
          field_type: f.fieldType,
          is_required: !!f.isRequired,
          display_order: f.displayOrder ?? index,
          dropdown_options: f.dropdownOptions || null,
        }))
      )
      if (fieldsError) throw fieldsError
    }

    return { success: true, data: registerRow, error: null }
  } catch (error) {
    console.error('createRegisterDefinition:', error)
    return { success: false, data: null, error: error.message || 'Failed to create register' }
  }
}

/**
 * @param {string} registerId
 * @param {{ label?: string, icon?: string, description?: string,
 *   statusWorkflow?: Array<{key:string,label:string}>, isActive?: boolean }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateRegisterDefinition(registerId, updates, { isSystemDefined } = {}) {
  if (isSystemDefined) {
    return { success: false, error: 'System-defined registers cannot be edited.' }
  }
  try {
    const patch = {}
    if (updates.label !== undefined) patch.label = updates.label
    if (updates.icon !== undefined) patch.icon = updates.icon
    if (updates.description !== undefined) patch.description = updates.description
    if (updates.statusWorkflow !== undefined) patch.status_workflow = updates.statusWorkflow
    if (updates.isActive !== undefined) patch.is_active = updates.isActive
    patch.updated_at = new Date().toISOString()

    const { error } = await supabase.from('local_registers').update(patch).eq('id', registerId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateRegisterDefinition:', error)
    return { success: false, error: error.message || 'Failed to update register' }
  }
}

/**
 * @param {string} registerId
 * @param {{fieldKey:string, fieldLabel:string, fieldType:string, isRequired?:boolean,
 *   displayOrder?:number, dropdownOptions?:array}} field
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function addField(registerId, field) {
  try {
    const { data, error } = await supabase
      .from('local_register_fields')
      .insert({
        register_id: registerId,
        field_key: field.fieldKey,
        field_label: field.fieldLabel,
        field_type: field.fieldType,
        is_required: !!field.isRequired,
        display_order: field.displayOrder ?? 0,
        dropdown_options: field.dropdownOptions || null,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addField:', error)
    return { success: false, data: null, error: error.message || 'Failed to add field' }
  }
}

/**
 * @param {Array<{id: string, displayOrder: number}>} orderedFields
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function reorderFields(orderedFields) {
  try {
    const updates = (orderedFields || []).map((f) =>
      supabase.from('local_register_fields').update({ display_order: f.displayOrder }).eq('id', f.id)
    )
    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed) throw failed.error
    return { success: true, error: null }
  } catch (error) {
    console.error('reorderFields:', error)
    return { success: false, error: error.message || 'Failed to reorder fields' }
  }
}

/**
 * @param {string} fieldId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function removeField(fieldId) {
  try {
    const { error } = await supabase.from('local_register_fields').delete().eq('id', fieldId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('removeField:', error)
    return { success: false, error: error.message || 'Failed to remove field' }
  }
}

export default {
  getRegisterDefinition,
  listRegistersForScope,
  listAllRegistersForAccount,
  createRegisterDefinition,
  updateRegisterDefinition,
  addField,
  reorderFields,
  removeField,
}
