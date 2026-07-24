/**
 * Enterprise Environment Factors — Simulator (sim schema)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'

const TABLE = 'enterprise_environment_factors'
const CAT = 'eef_categories'

export async function listEEFCategories(organisationId) {
  if (!organisationId) return { data: [], error: new Error('Organisation required') }
  const { data, error } = await simDb
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
  let q = simDb
    .from(TABLE)
    .select(
      `
      *,
      category:${CAT}(id, code, name, eef_kind),
      run:related_simulation_run_id(id, scenario_id, created_at)
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
  const { data, error } = await simDb
    .from(TABLE)
    .select(
      `
      *,
      category:${CAT}(id, code, name, eef_kind),
      run:related_simulation_run_id(id, scenario_id, created_at)
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
  const { data, error } = await simDb.from(TABLE).insert({ ...payload, created_by: user.id }).select().single()
  return { data, error }
}

export async function updateEEF(id, patch) {
  const { data, error } = await simDb
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteEEF(id) {
  const { error } = await simDb.from(TABLE).delete().eq('id', id)
  return { error }
}

export async function listSimulationRunsForPicker() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data, error } = await simDb
    .from('simulation_runs')
    .select('id, scenario_id, created_at, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)
  return { data: data || [], error }
}

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

      const { error } = await simDb.from(TABLE).insert({
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
        related_simulation_run_id: null,
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
