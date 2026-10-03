/**
 * Intake Forms service (GAP-06, v963 Phase 9) — Simulator mirror of
 * apps/platform/src/services/intakeFormService.js. Always targets the `sim` schema (simDb) —
 * this app must never read/write `public` schema data (Simulator Module Architecture Rules).
 * sim.intake_forms links to sim.practice_projects via `practice_project_id`, not `project_id`
 * (SQL/v963g_intake_forms_sim_schema_mirror.sql) — every caller here must pass that field name.
 * Soft-delete only (is_deleted flag) for forms/fields/submissions.
 */
import { simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

const SIM = { sim: true }

/** 32-char hex token for the public-facing submission URL (`?token=...`). */
export function generatePublicToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Forms ──────────────────────────────────────────────────────────────────

export async function listForms() {
  const rows = await listGapRecords('intake_forms', { ...SIM, orderBy: 'form_name', ascending: true })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getForm(id) {
  return getGapRecord('intake_forms', id, SIM)
}

export async function createForm(payload) {
  const row = { public_token: generatePublicToken(), ...payload }
  return createGapRecord('intake_forms', row, { ...SIM, setCreatedBy: true })
}

export async function updateForm(id, payload) {
  return updateGapRecord('intake_forms', id, payload, SIM)
}

export async function deleteForm(id) {
  return updateGapRecord('intake_forms', id, { is_deleted: true }, SIM)
}

/** Practice projects the current user can optionally attach a form to (practice_project_id is nullable). */
export async function listProjectOptions() {
  const { data, error } = await simDb
    .from('practice_projects')
    .select('id, project_name')
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Fields ─────────────────────────────────────────────────────────────────

export async function listFields(formId) {
  if (!formId) return []
  const { data, error } = await simDb
    .from('intake_form_fields')
    .select('*')
    .eq('form_id', formId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createField(payload) {
  return createGapRecord('intake_form_fields', payload, SIM)
}

export async function updateField(id, payload) {
  return updateGapRecord('intake_form_fields', id, payload, SIM)
}

export async function deleteField(id) {
  return updateGapRecord('intake_form_fields', id, { is_deleted: true }, SIM)
}

// ── Submissions (read-focused — created externally via the public form, not here) ──────────

export async function listSubmissions({ formId } = {}) {
  let q = simDb.from('intake_form_submissions').select('*').eq('is_deleted', false).order('submitted_at', { ascending: false })
  if (formId) q = q.eq('form_id', formId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getSubmission(id) {
  return getGapRecord('intake_form_submissions', id, SIM)
}

export async function listSubmissionData(submissionId) {
  if (!submissionId) return []
  const { data, error } = await simDb
    .from('intake_form_submission_data')
    .select('*')
    .eq('submission_id', submissionId)
  if (error) throw error
  return data || []
}

export async function updateSubmissionStatus(id, status) {
  return updateGapRecord('intake_form_submissions', id, { submission_status: status }, SIM)
}

/** Forms joined with a submission count — used by the forms list page. */
export async function listFormsWithSubmissionCounts() {
  const [forms, submissions] = await Promise.all([listForms(), listSubmissions()])
  const counts = {}
  for (const s of submissions || []) counts[s.form_id] = (counts[s.form_id] || 0) + 1
  return (forms || []).map((f) => ({ ...f, submission_count: counts[f.id] || 0 }))
}
