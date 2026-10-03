/**
 * Intake Forms service (GAP-06, v963 Phase 9) — Forms / Fields / Submissions CRUD.
 * Reuses the generic pmis-gaps gapDataService helpers for plain single-table CRUD and adds
 * thin filtered-list queries where a simple .eq() filter is needed (fields/submissions by form).
 * Soft-delete only (is_deleted flag) for forms/fields/submissions.
 */
import { platformDb, simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

function client(sim) {
  return sim ? simDb : platformDb
}

/** 32-char hex token for the public-facing submission URL (`?token=...`). */
export function generatePublicToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Forms ──────────────────────────────────────────────────────────────────

export async function listForms({ sim = false } = {}) {
  const rows = await listGapRecords('intake_forms', { sim, orderBy: 'form_name', ascending: true })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getForm(id, { sim = false } = {}) {
  return getGapRecord('intake_forms', id, { sim })
}

export async function createForm(payload, opts = {}) {
  const { sim = false } = opts
  const row = { public_token: generatePublicToken(), ...payload }
  return createGapRecord('intake_forms', row, { sim })
}

export async function updateForm(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('intake_forms', id, payload, { sim })
}

export async function deleteForm(id, { sim = false } = {}) {
  return updateGapRecord('intake_forms', id, { is_deleted: true }, { sim })
}

// ── Fields ─────────────────────────────────────────────────────────────────

export async function listFields(formId, { sim = false } = {}) {
  if (!formId) return []
  const db = client(sim)
  const { data, error } = await db
    .from('intake_form_fields')
    .select('*')
    .eq('form_id', formId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createField(payload, opts = {}) {
  const { sim = false } = opts
  return createGapRecord('intake_form_fields', payload, { sim })
}

export async function updateField(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('intake_form_fields', id, payload, { sim })
}

export async function deleteField(id, { sim = false } = {}) {
  return updateGapRecord('intake_form_fields', id, { is_deleted: true }, { sim })
}

// ── Submissions (read-focused — created externally via the public form, not here) ──────────

export async function listSubmissions({ formId, sim = false } = {}) {
  const db = client(sim)
  let q = db.from('intake_form_submissions').select('*').eq('is_deleted', false).order('submitted_at', { ascending: false })
  if (formId) q = q.eq('form_id', formId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getSubmission(id, { sim = false } = {}) {
  return getGapRecord('intake_form_submissions', id, { sim })
}

export async function listSubmissionData(submissionId, { sim = false } = {}) {
  if (!submissionId) return []
  const db = client(sim)
  const { data, error } = await db
    .from('intake_form_submission_data')
    .select('*')
    .eq('submission_id', submissionId)
  if (error) throw error
  return data || []
}

export async function updateSubmissionStatus(id, status, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('intake_form_submissions', id, { submission_status: status }, { sim })
}

/** Forms joined with a submission count — used by the forms list page. */
export async function listFormsWithSubmissionCounts({ sim = false } = {}) {
  const [forms, submissions] = await Promise.all([
    listForms({ sim }),
    listSubmissions({ sim }),
  ])
  const counts = {}
  for (const s of submissions || []) counts[s.form_id] = (counts[s.form_id] || 0) + 1
  return (forms || []).map((f) => ({ ...f, submission_count: counts[f.id] || 0 }))
}
