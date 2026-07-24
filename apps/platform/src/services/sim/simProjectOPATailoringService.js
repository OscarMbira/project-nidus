/**
 * PM OPA template tailoring — Simulator (sim schema)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'
import {
  OPA_FIELD_REGISTRY,
  buildDefaultFieldConfigs,
  normalizeFieldConfigs,
} from '../projectOPATailoringService'
import { exportToExcel, exportListToPPT } from '../../utils/exportUtils'

export { OPA_FIELD_REGISTRY, buildDefaultFieldConfigs, normalizeFieldConfigs }

const CUSTOM = 'project_opa_customisations'
const FIELDS = 'project_template_field_config'
const OPA = 'organisational_process_assets'

export async function listProjectCustomisations(projectId, opts) {
  let q = simDb
    .from(CUSTOM)
    .select(`*, source:${OPA}(id, title, opa_type, version, status)`)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })

  if (opts?.status) q = q.eq('status', opts.status)

  const { data, error } = await q
  if (error) return { data: [], error }

  let rows = data || []
  const search = opts?.search
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.custom_title && r.custom_title.toLowerCase().includes(s)) ||
        (r.custom_description && r.custom_description.toLowerCase().includes(s)) ||
        (r.source?.title && r.source.title.toLowerCase().includes(s))
    )
  }
  return { data: rows, error: null }
}

export async function getCustomisationById(id) {
  const { data, error } = await simDb
    .from(CUSTOM)
    .select(
      `
      *,
      source:${OPA}(id, title, description, opa_type, version, status, document_reference, effective_date, expiry_date, tags, notes)
    `
    )
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  return { data, error }
}

export async function getFieldConfigs(customisationId) {
  const { data, error } = await simDb
    .from(FIELDS)
    .select('*')
    .eq('customisation_id', customisationId)
    .order('sort_order', { ascending: true })
  return { data: data || [], error }
}

async function upsertFieldConfigs(customisationId, fieldConfigs) {
  const rows = normalizeFieldConfigs(fieldConfigs).map((c) => ({
    customisation_id: customisationId,
    ...c,
  }))
  const { error: delErr } = await simDb.from(FIELDS).delete().eq('customisation_id', customisationId)
  if (delErr) return { error: delErr }
  if (!rows.length) return { error: null }
  const { error } = await simDb.from(FIELDS).insert(rows)
  return { error }
}

export async function createCustomisation(payload, fieldConfigs) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  const row = {
    project_id: payload.project_id,
    source_opa_id: payload.source_opa_id,
    created_by: user.id,
    custom_title: payload.custom_title?.trim(),
    custom_description: payload.custom_description || null,
    version: payload.version || '1.0',
    status: payload.status || 'draft',
    notes: payload.notes || null,
    is_on_hold: !!payload.is_on_hold,
    on_hold_reason: payload.is_on_hold ? payload.on_hold_reason || 'Draft' : null,
    is_active: payload.is_active !== false,
  }

  if (!row.custom_title) return { data: null, error: new Error('Title is required') }

  const { data, error } = await simDb.from(CUSTOM).insert(row).select().single()
  if (error || !data) return { data, error }

  const { error: fErr } = await upsertFieldConfigs(data.id, fieldConfigs)
  if (fErr) {
    await simDb.from(CUSTOM).delete().eq('id', data.id)
    return { data: null, error: fErr }
  }

  return getCustomisationById(data.id)
}

export async function updateCustomisation(id, payload, fieldConfigs) {
  const patch = {
    ...(payload.custom_title !== undefined ? { custom_title: payload.custom_title?.trim() } : {}),
    ...(payload.custom_description !== undefined ? { custom_description: payload.custom_description } : {}),
    ...(payload.version !== undefined ? { version: payload.version } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.is_on_hold !== undefined ? { is_on_hold: payload.is_on_hold } : {}),
    ...(payload.on_hold_reason !== undefined ? { on_hold_reason: payload.on_hold_reason } : {}),
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    updated_at: new Date().toISOString(),
  }

  const { error } = await simDb.from(CUSTOM).update(patch).eq('id', id).eq('is_deleted', false)
  if (error) return { data: null, error }

  if (fieldConfigs) {
    const { error: fErr } = await upsertFieldConfigs(id, fieldConfigs)
    if (fErr) return { data: null, error: fErr }
  }

  return getCustomisationById(id)
}

export async function archiveCustomisation(id) {
  return updateCustomisation(id, { status: 'archived', is_active: false })
}

export async function deleteCustomisation(id) {
  const { data, error } = await simDb
    .from(CUSTOM)
    .update({ is_deleted: true, is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function putCustomisationOnHold(id, reason) {
  return updateCustomisation(id, {
    is_on_hold: true,
    on_hold_reason: reason || 'On hold',
    status: 'draft',
  })
}

export async function resumeCustomisationFromHold(id) {
  return updateCustomisation(id, {
    is_on_hold: false,
    on_hold_reason: null,
    status: 'active',
  })
}

export async function exportCustomisationToExcel(customisation, fieldConfigs) {
  const visible = normalizeFieldConfigs(fieldConfigs).filter((f) => f.is_visible)
  const cols = [
    { key: 'custom_title', label: 'Title' },
    { key: 'version', label: 'Version' },
    { key: 'status', label: 'Status' },
    ...visible.map((f) => ({ key: f.field_key, label: f.custom_label || f.field_label })),
  ]
  const source = customisation.source || {}
  const record = {
    custom_title: customisation.custom_title,
    version: customisation.version,
    status: customisation.status,
    title: source.title,
    description: source.description,
    opa_type: source.opa_type,
    document_reference: source.document_reference,
    effective_date: source.effective_date,
    expiry_date: source.expiry_date,
    tags: Array.isArray(source.tags) ? source.tags.join('; ') : '',
    notes: customisation.notes || source.notes,
  }
  exportToExcel(cols, [record], `OPA_Template_${customisation.id?.slice(0, 8) || 'export'}`)
}

export async function exportCustomisationToPpt(customisation, fieldConfigs) {
  const visible = normalizeFieldConfigs(fieldConfigs).filter((f) => f.is_visible)
  const cols = visible.map((f) => ({ key: f.field_key, label: f.custom_label || f.field_label }))
  const source = customisation.source || {}
  const row = { custom_title: customisation.custom_title }
  visible.forEach((f) => {
    let val = source[f.field_key]
    if (f.field_key === 'tags' && Array.isArray(val)) val = val.join('; ')
    row[f.field_key] = val ?? '—'
  })
  exportListToPPT(
    [{ key: 'custom_title', label: 'Template' }, ...cols],
    [row],
    `OPA_Template_${customisation.id?.slice(0, 8) || 'export'}`
  )
}

/** Returns practice projects / simulation runs for use in picker dropdowns. */
export async function listSimulationRunsForPicker() {
  const { data, error } = await simDb
    .from('simulation_runs')
    .select('id, run_name, status, created_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('listSimulationRunsForPicker:', error.message)
    return { data: [] }
  }
  return { data: data || [] }
}
