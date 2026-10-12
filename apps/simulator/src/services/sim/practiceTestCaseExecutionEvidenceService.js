import { simDb } from '../supabase/supabaseClient'
import { resolveSimInternalUserId } from '@nidus/shared/utils/resolveSimInternalUserId'

// Evidence for Simulator practice test case executions (PRD v1204 parity; SQL/v1202).
export const PRACTICE_EVIDENCE_BUCKET = 'testing-centre-evidence'
const TABLE = 'practice_test_case_execution_evidence'

function safeFileName(name) {
  return String(name || 'file').trim().replace(/\s+/g, '_')
}

export async function listEvidenceForRun(runId) {
  const { data, error } = await simDb
    .from(TABLE)
    .select('*')
    .eq('run_id', runId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function uploadPracticeExecutionEvidence({ executionId, runId, practiceProjectId, file }) {
  const path = `practice/executions/${executionId}/${Date.now()}-${safeFileName(file.name)}`

  const { error: upErr } = await simDb.storage
    .from(PRACTICE_EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) throw upErr

  const uploadedBy = await resolveSimInternalUserId()
  const { data, error } = await simDb
    .from(TABLE)
    .insert({
      practice_test_case_execution_id: executionId,
      run_id: runId,
      practice_project_id: practiceProjectId,
      storage_bucket: PRACTICE_EVIDENCE_BUCKET,
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

/** Soft delete only (PRD decision 5). */
export async function softDeletePracticeExecutionEvidence(evidenceId) {
  const deletedBy = await resolveSimInternalUserId()
  const { data, error } = await simDb
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy || null })
    .eq('id', evidenceId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Project override for the requirement resolver. The organisation default is not
 * wired for the Simulator yet (practice projects have no account link — open decision).
 */
export async function getPracticeEvidenceRequirementSettings(practiceProjectId) {
  const { data, error } = await simDb
    .from('practice_projects')
    .select('test_evidence_requirement, user_id')
    .eq('id', practiceProjectId)
    .maybeSingle()
  if (error) throw error
  return {
    projectValue: data?.test_evidence_requirement ?? null,
    accountDefault: null,
    // The practice project owner plays the Project Manager role for removal (SQL/v1202).
    ownerUserId: data?.user_id ?? null,
  }
}
