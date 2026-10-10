import { platformDb } from './supabase/supabaseClient'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'

// Evidence for manual test case executions (PRD v1204, decision 1; SQL/v1201).
export const EVIDENCE_BUCKET = 'testing-centre-evidence'
const TABLE = 'test_case_execution_evidence'

function safeFileName(name) {
  return String(name || 'file').trim().replace(/\s+/g, '_')
}

export async function listEvidenceForRun(runId) {
  const { data, error } = await platformDb
    .from(TABLE)
    .select('*')
    .eq('run_id', runId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

const PROJECT_LIST_SELECT = `
  id, file_name, mime_type, storage_path, created_at, run_id, test_case_execution_id, uploaded_by,
  uploader:users!uploaded_by ( full_name ),
  run:test_runs!run_id ( run_name, status ),
  execution:test_case_executions!test_case_execution_id (
    status,
    test_case:test_cases!test_case_id ( test_case_ref, title ),
    defect:defects!defect_id ( id, defect_ref )
  )
`

/** Live evidence for every run in a project (Testing → Evidence page). */
export async function listEvidenceForProject(projectId) {
  const { data, error } = await platformDb
    .from(TABLE)
    .select(PROJECT_LIST_SELECT)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Outcome filter for the Evidence page: 'passed' | 'failed' | 'all'. */
export function filterEvidenceByOutcome(rows, outcome) {
  if (outcome === 'all') return rows
  return rows.filter((r) => r.execution?.status === outcome)
}

/** One flat object per evidence row, for the table and the export menu. */
export function flattenEvidenceRow(row) {
  return {
    id: row.id,
    testCaseRef: row.execution?.test_case?.test_case_ref || '',
    testCaseTitle: row.execution?.test_case?.title || '',
    runName: row.run?.run_name || '',
    runStatus: row.run?.status || '',
    outcome: row.execution?.status || '',
    fileName: row.file_name,
    mimeType: row.mime_type || '',
    uploadedBy: row.uploader?.full_name || '',
    uploadedById: row.uploaded_by || null,
    uploadedAt: row.created_at,
    defectId: row.execution?.defect?.id || null,
    defectRef: row.execution?.defect?.defect_ref || '',
    storagePath: row.storage_path,
  }
}

/** Short-lived link to open an evidence file in a new tab. */
export async function getEvidenceSignedUrl(storagePath, expiresInSeconds = 3600) {
  const { data, error } = await platformDb.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) throw error
  return data?.signedUrl || null
}

export async function uploadExecutionEvidence({ executionId, runId, projectId, file }) {
  const name = safeFileName(file.name)
  const path = `executions/${executionId}/${Date.now()}-${name}`

  const { error: upErr } = await platformDb.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) throw upErr

  const uploadedBy = await resolveInternalUserId()
  const { data, error } = await platformDb
    .from(TABLE)
    .insert({
      test_case_execution_id: executionId,
      run_id: runId,
      project_id: projectId,
      storage_bucket: EVIDENCE_BUCKET,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size ?? null,
      uploaded_by: uploadedBy || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Soft delete only (PRD decision 5). The row stays for the audit history. */
export async function softDeleteExecutionEvidence(evidenceId) {
  const deletedBy = await resolveInternalUserId()
  const { data, error } = await platformDb
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy || null })
    .eq('id', evidenceId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Raw inputs for the requirement resolver (packages/shared testEvidenceRequirement.js):
 * the project override and the organisation default.
 */
export async function getEvidenceRequirementSettings(projectId) {
  const { data: project, error: pErr } = await platformDb
    .from('projects')
    .select('test_evidence_requirement, account_id')
    .eq('id', projectId)
    .maybeSingle()
  if (pErr) throw pErr

  let accountDefault = null
  if (project?.account_id) {
    const { data: account, error: aErr } = await platformDb
      .from('accounts')
      .select('test_evidence_default')
      .eq('id', project.account_id)
      .maybeSingle()
    if (aErr) throw aErr
    accountDefault = account?.test_evidence_default ?? null
  }

  return {
    projectValue: project?.test_evidence_requirement ?? null,
    accountDefault,
  }
}
