/**
 * Enterprise Environment Factors — Platform (public schema)
 */

import { platformDb } from './supabase/supabaseClient'

const TABLE = 'enterprise_environment_factors'
const CAT = 'eef_categories'

/**
 * Insert standard sample EEF/OPA rows for this organisation via DB RPC (requires v405 migration).
 * Idempotent when data already exists.
 */
export async function ensureEefOpaSampleForAccount(organisationId) {
  if (!organisationId) return { data: null, error: new Error('Organisation required') }
  const { data, error } = await platformDb.rpc('ensure_eef_opa_sample_for_account', {
    p_account_id: organisationId,
  })
  return { data, error }
}

export async function listEEFCategories(organisationId) {
  if (!organisationId) return { data: [], error: new Error('Organisation required') }
  const { data, error } = await platformDb
    .from(CAT)
    .select('id, code, name, description, eef_kind, sort_order, is_active, organisation_id')
    .or(`organisation_id.is.null,organisation_id.eq.${organisationId}`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) return { data: [], error }
  return { data: data || [], error: null }
}

export async function listEEFs(organisationId, { search = '', onHoldOnly = false } = {}) {
  if (!organisationId) return { data: [], error: new Error('Organisation required') }
  let q = platformDb
    .from(TABLE)
    .select(
      `
      *,
      category:${CAT}(id, code, name, eef_kind)
    `
    )
    .eq('organisation_id', organisationId)
    .order('updated_at', { ascending: false })

  if (onHoldOnly) q = q.eq('is_on_hold', true)

  const { data, error } = await q
  if (error) return { data: [], error }
  let rows = data || []
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.notes && r.notes.toLowerCase().includes(s))
    )
  }
  return { data: rows, error: null }
}

export async function getEEFById(id) {
  const { data, error } = await platformDb
    .from(TABLE)
    .select(
      `
      *,
      category:${CAT}(id, code, name, eef_kind)
    `
    )
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function createEEF(payload) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  const row = {
    ...payload,
    created_by: user.id,
  }
  const { data, error } = await platformDb.from(TABLE).insert(row).select().single()
  return { data, error }
}

export async function updateEEF(id, patch) {
  const { data, error } = await platformDb.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  return { data, error }
}

export async function deleteEEF(id) {
  const { error } = await platformDb.from(TABLE).delete().eq('id', id)
  return { error }
}

export async function listProjectsForOrganisation(organisationId) {
  if (!organisationId) return { data: [], error: null }
  const { data, error } = await platformDb
    .from('projects')
    .select('id, project_name, project_code')
    .eq('account_id', organisationId)
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
  return { data: data || [], error }
}

/**
 * Parse CSV text (header row). Expected columns: title, eef_type, impact_level, impact_direction, status, category_code, description, source_reference, notes
 */
export async function bulkImportEEFFromParsedRows(organisationId, rows, { onProgress } = {}) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { imported: 0, errors: ['Not authenticated'] }
  const { data: cats } = await listEEFCategories(organisationId)
  const codeToId = new Map((cats || []).filter((c) => c.code).map((c) => [c.code.toLowerCase(), c.id]))

  let imported = 0
  const errors = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      const title = (r.title || r.Title || '').trim()
      if (!title) {
        errors.push(`Row ${i + 2}: missing title`)
        continue
      }
      const category_code = (r.category_code || r.categoryCode || '').trim().toLowerCase()
      const category_id = category_code ? codeToId.get(category_code) : null

      const { error } = await platformDb.from(TABLE).insert({
        organisation_id: organisationId,
        created_by: user.id,
        title,
        description: r.description || null,
        category_id: category_id || null,
        eef_type: normalizeEnum(r.eef_type || r.eefType, ['internal', 'external'], 'internal'),
        impact_level: normalizeEnum(r.impact_level || r.impactLevel, ['high', 'medium', 'low'], 'medium'),
        impact_direction: normalizeEnum(r.impact_direction || r.impactDirection, ['positive', 'negative', 'neutral'], 'neutral'),
        source_reference: r.source_reference || r.sourceReference || null,
        status: normalizeEnum(r.status, ['active', 'under_review', 'inactive'], 'active'),
        notes: r.notes || null,
        is_on_hold: parseBool(r.is_on_hold || r.isOnHold, false),
        on_hold_reason: r.on_hold_reason || r.onHoldReason || null,
      })
      if (error) errors.push(`Row ${i + 2}: ${error.message}`)
      else imported++
      onProgress?.({ done: i + 1, total: rows.length })
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e.message || String(e)}`)
    }
  }
  return { imported, errors }
}

function normalizeEnum(val, allowed, fallback) {
  const v = String(val || '')
    .trim()
    .toLowerCase()
  return allowed.includes(v) ? v : fallback
}

function parseBool(v, d) {
  if (v === true || v === false) return v
  const s = String(v || '').toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no') return false
  return d
}
