/**
 * Local Register Engine — register definitions (Simulator, v938).
 *
 * Unlike Platform (where every register lives in public.local_registers), Simulator splits
 * across two schemas: the 28 system-defined registers are NOT duplicated per app — they stay
 * the single source of truth in public.local_registers (queried here via `supabase`, which
 * resolves to platformDb/public — see services/supabaseClient.js) and are shared read-only.
 * Member-created registers for Simulator's practice hierarchy live in their own
 * sim.local_registers/sim.local_register_fields (queried via `simDb`), scoped to
 * sim.practice_portfolios/practice_programmes/practice_projects instead of Platform's
 * public.portfolios/programmes/projects. See SQL/v938_sim_local_register_engine_schema.sql.
 *
 * A registerId's origin (sim vs public) isn't encoded in the id itself, so lookups try sim
 * first and fall back to public — same "try local, fall back to shared" shape used nowhere
 * else in the codebase but the simplest option here (rule 62) given only two possible sources.
 */

import { supabase, simDb } from './supabaseClient'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { isLikelyDatabaseUuid } from '../utils/isUuid'

async function loadFields(client, registerRowId) {
  const { data, error } = await client
    .from('local_register_fields')
    .select('*')
    .eq('register_id', registerRowId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Resolve a register by UUID (either schema) or by its friendly `register_key` (rule 16.3).
 * Key lookups check public.local_registers (system-defined — the common case, e.g. the ICT
 * taxonomy registers) first, then fall back to sim.local_registers scoped to the caller's own
 * account (member-created practice registers) — never returns another account's register on a
 * name collision, same guarantee as the Platform copy of this function.
 * @param {string} registerId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getRegisterDefinition(registerId) {
  if (!registerId) return { success: true, data: null, error: null }
  try {
    if (isLikelyDatabaseUuid(registerId)) {
      const simRegisterRes = await simDb.from('local_registers').select('*').eq('id', registerId).maybeSingle()
      if (simRegisterRes.error) throw simRegisterRes.error
      if (simRegisterRes.data) {
        const fields = await loadFields(simDb, registerId)
        return { success: true, data: { ...simRegisterRes.data, is_system_defined: false, fields }, error: null }
      }

      const registerRes = await supabase.from('local_registers').select('*').eq('id', registerId).maybeSingle()
      if (registerRes.error) throw registerRes.error
      if (!registerRes.data) return { success: true, data: null, error: null }
      const fields = await loadFields(supabase, registerId)
      return { success: true, data: { ...registerRes.data, fields }, error: null }
    }

    const systemRes = await supabase
      .from('local_registers')
      .select('*')
      .eq('register_key', registerId)
      .eq('is_system_defined', true)
      .limit(1)
      .maybeSingle()
    if (systemRes.error) throw systemRes.error
    if (systemRes.data) {
      const fields = await loadFields(supabase, systemRes.data.id)
      return { success: true, data: { ...systemRes.data, fields }, error: null }
    }

    const accountId = await getCurrentUserAccountId()
    if (accountId) {
      const ownRes = await simDb
        .from('local_registers')
        .select('*')
        .eq('register_key', registerId)
        .eq('account_id', accountId)
        .limit(1)
        .maybeSingle()
      if (ownRes.error) throw ownRes.error
      if (ownRes.data) {
        const fields = await loadFields(simDb, ownRes.data.id)
        return { success: true, data: { ...ownRes.data, is_system_defined: false, fields }, error: null }
      }
    }

    return { success: true, data: null, error: null }
  } catch (error) {
    console.error('getRegisterDefinition:', error)
    return { success: false, data: null, error: error.message || 'Failed to load register definition' }
  }
}

/**
 * Same industry-pack resolution as Platform's copy — account_industries/industry_categories/
 * industry_packs are shared public-schema tables, not per-app, since an account's enabled
 * industries are an organisation-level concept regardless of which app a user is currently in.
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
 * Registers visible at a given practice scope — system-defined ones (public.local_registers)
 * whose industry-pack link matches, plus member-created ones (sim.local_registers) at this
 * exact practice-hierarchy entity.
 * @param {{ scopeLevel: 'pmo'|'portfolio'|'programme'|'project', scopeEntityId?: string, accountId: string }} params
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listRegistersForScope({ scopeLevel, scopeEntityId, accountId }) {
  if (!accountId || !scopeLevel) return { success: true, data: [], error: null }
  try {
    const packIds = await getEnabledIndustryPackIds(accountId)

    let localQuery = simDb
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

    const [localResult, systemResult] = results
    const combined = [
      ...(localResult.data || []).map((r) => ({ ...r, is_system_defined: false })),
      ...(systemResult?.data || []),
    ]
    const deduped = Array.from(new Map(combined.map((r) => [r.id, r])).values())
    deduped.sort((a, b) => a.label.localeCompare(b.label))

    return { success: true, data: deduped, error: null }
  } catch (error) {
    console.error('listRegistersForScope:', error)
    return { success: false, data: [], error: error.message || 'Failed to load registers' }
  }
}

/**
 * Every register visible to an account across the whole practice hierarchy — the pmo-cat-admin
 * oversight view equivalent for Simulator.
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listAllRegistersForAccount(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const packIds = await getEnabledIndustryPackIds(accountId)

    const queries = [simDb.from('local_registers').select('*').eq('account_id', accountId)]
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

    const [localResult, systemResult] = results
    const combined = [
      ...(localResult.data || []).map((r) => ({ ...r, is_system_defined: false })),
      ...(systemResult?.data || []),
    ]
    const deduped = Array.from(new Map(combined.map((r) => [r.id, r])).values())
    deduped.sort((a, b) => (b.is_system_defined ? 1 : 0) - (a.is_system_defined ? 1 : 0) || a.label.localeCompare(b.label))

    return { success: true, data: deduped, error: null }
  } catch (error) {
    console.error('listAllRegistersForAccount:', error)
    return { success: false, data: [], error: error.message || 'Failed to load registers' }
  }
}

/**
 * Always creates a member-created register in sim.local_registers — Simulator never writes a
 * new system-defined register (those are seeded centrally into public.local_registers only).
 * @param {{ registerKey: string, label: string, icon?: string, description?: string,
 *   scopeLevel: string, scopePortfolioId?: string, scopeProgrammeId?: string,
 *   scopeProjectId?: string, accountId: string, statusWorkflow: Array<{key:string,label:string}>,
 *   fields: Array<{fieldKey:string, fieldLabel:string, fieldType:string, isRequired?:boolean,
 *   displayOrder?:number, dropdownOptions?:array}> }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createRegisterDefinition(params) {
  try {
    const { data: registerRow, error: registerError } = await simDb
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
      })
      .select()
      .single()
    if (registerError) throw registerError

    const fields = params.fields || []
    if (fields.length > 0) {
      const { error: fieldsError } = await simDb.from('local_register_fields').insert(
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

    return { success: true, data: { ...registerRow, is_system_defined: false }, error: null }
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

    const { error } = await simDb.from('local_registers').update(patch).eq('id', registerId)
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
    const { data, error } = await simDb
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
      simDb.from('local_register_fields').update({ display_order: f.displayOrder }).eq('id', f.id)
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
    const { error } = await simDb.from('local_register_fields').delete().eq('id', fieldId)
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
