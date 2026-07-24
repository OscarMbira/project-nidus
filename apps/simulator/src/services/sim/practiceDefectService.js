/**
 * Practice defects (sim.practice_defects*) — Simulator parity.
 */
import { simDb } from '../supabase/supabaseClient'

const BUCKET = 'sim-defect-attachments'

export async function getPracticeDefects(practiceProjectId, filters = {}) {
  let query = simDb
    .from('practice_defects')
    .select('*, test_cases:practice_test_cases(id, test_case_ref, title)')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,defect_ref.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPracticeDefectById(defectId) {
  const { data, error } = await simDb
    .from('practice_defects')
    .select(
      '*, test_cases:practice_test_cases(id, test_case_ref, title), test_case_executions:practice_test_case_executions(id, status, actual_result)',
    )
    .eq('id', defectId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return data
}

export async function createPracticeDefect(row) {
  const { data, error } = await simDb.from('practice_defects').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updatePracticeDefect(defectId, updates) {
  const { data, error } = await simDb
    .from('practice_defects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', defectId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPracticeDefectComments(defectId) {
  const { data, error } = await simDb
    .from('practice_defect_comments')
    .select('*')
    .eq('defect_id', defectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addPracticeDefectComment(defectId, { comment, is_internal = false, created_by }) {
  const { data, error } = await simDb
    .from('practice_defect_comments')
    .insert({ defect_id: defectId, comment, is_internal, created_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPracticeDefectHistory(defectId) {
  const { data, error } = await simDb
    .from('practice_defect_history')
    .select('*')
    .eq('defect_id', defectId)
    .order('changed_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPracticeDefectAttachments(defectId) {
  const { data, error } = await simDb
    .from('practice_defect_attachments')
    .select('*')
    .eq('defect_id', defectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadPracticeDefectAttachment({
  practiceProjectId,
  defectId,
  file,
  is_screenshot = false,
  uploaded_by,
}) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${practiceProjectId}/${defectId}/${Date.now()}_${safeName}`
  const { error: upErr } = await simDb.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr
  const { data: pub } = simDb.storage.from(BUCKET).getPublicUrl(path)
  const { data: signed } = await simDb.storage.from(BUCKET).createSignedUrl(path, 3600)
  const file_url = signed?.signedUrl || pub?.publicUrl || path
  const { data, error } = await simDb
    .from('practice_defect_attachments')
    .insert({
      defect_id: defectId,
      file_name: file.name,
      file_url,
      file_path: path,
      file_type: file.type || null,
      file_size: file.size ?? null,
      is_screenshot,
      uploaded_by,
    })
    .select()
    .single()
  if (error) throw error
  return { attachment: data, signedUrl: signed?.signedUrl || null }
}

export async function deletePracticeDefectAttachment(attachmentId) {
  const { data: row, error: fErr } = await simDb
    .from('practice_defect_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()
  if (fErr) throw fErr
  if (row?.file_path) await simDb.storage.from(BUCKET).remove([row.file_path])
  const { error } = await simDb.from('practice_defect_attachments').delete().eq('id', attachmentId)
  if (error) throw error
}

export async function getPracticeDefectStats(practiceProjectId) {
  const { data, error } = await simDb
    .from('practice_defects')
    .select('status, severity, created_at')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
  if (error) throw error
  const byStatus = {}
  const bySeverity = {}
  const trend = {}
  for (const row of data || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1
    bySeverity[row.severity] = (bySeverity[row.severity] || 0) + 1
    const d = row.created_at ? String(row.created_at).slice(0, 10) : ''
    if (d) trend[d] = (trend[d] || 0) + 1
  }
  return { total: data?.length || 0, byStatus, bySeverity, trend }
}
