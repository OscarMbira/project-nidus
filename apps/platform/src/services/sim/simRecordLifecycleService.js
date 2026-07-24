/**
 * Record lifecycle service — Simulator (sim schema)
 * @see projectplan/v639_Record_Lifecycle_Management_Plan.md
 */

import { simDb } from '../supabase/supabaseClient'
import * as platformService from '../recordLifecycleService'

/** Maps logical table names to sim physical tables */
export const SIM_LIFECYCLE_TABLE_MAP = {
  risks: 'practice_risks',
  issues: 'practice_issues',
  tasks: 'practice_tasks',
  defects: 'practice_defects',
  business_cases: 'practice_business_cases',
  stage_plans: 'practice_stage_plans',
  project_decisions: 'project_decisions',
  highlight_reports: 'practice_highlight_reports',
  exception_reports: 'practice_exception_reports',
  end_stage_reports: 'practice_end_stage_reports',
  lessons_reports: 'practice_lessons_reports',
  project_initiation_documents: 'practice_project_initiation_documents',
  benefits_review_plans: 'practice_benefits_review_plans',
}

function simTable(logicalName) {
  return SIM_LIFECYCLE_TABLE_MAP[logicalName] || logicalName
}

export async function getLifecycleConfig(accountId, projectId, tableName) {
  const { data, error } = await simDb
    .from('record_lifecycle_config')
    .select('*')
    .eq('table_name', tableName)
    .maybeSingle()
  if (error) throw error
  return data || platformService.getLifecycleConfig(accountId, projectId, tableName)
}

export async function getApprovalChain(accountId, projectId, tableName) {
  const { data, error } = await simDb
    .from('record_authorisers')
    .select('approval_level, role_label, authoriser_user_id')
    .eq('table_name', tableName)
    .eq('is_active', true)
    .order('approval_level')
  if (error) throw error
  return data || []
}

export async function submitForAuthorisation(tableName, recordId, rootRecordId, notes) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await simDb.from('record_authorisation_requests').insert({
    record_type: tableName,
    table_name: tableName,
    root_record_id: rootRecordId,
    record_id: recordId,
    submission_batch_id: crypto.randomUUID(),
    submitted_by: user.id,
    status: 'pending',
    submission_notes: notes,
    activated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  return data.submission_batch_id
}

export async function processDecision(requestId, decision, notes) {
  const { data, error } = await simDb
    .from('record_authorisation_requests')
    .update({ status: decision === 'approve' ? 'approved' : 'rejected', decision_notes: notes, decided_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getApprovalProgress(submissionBatchId) {
  const { data, error } = await simDb
    .from('record_authorisation_requests')
    .select('*')
    .eq('submission_batch_id', submissionBatchId)
  if (error) throw error
  return { levels: data || [], allComplete: data?.every((r) => r.status === 'approved') }
}

export async function queryRecords(recordType, options = {}) {
  const table = simTable(recordType)
  const { statusFilter = ['live'], projectId, page = 1, pageSize = 50 } = options
  const offset = (page - 1) * pageSize
  let q = simDb.from(table).select('*', { count: 'exact' }).in('record_status', statusFilter)
  if (projectId) q = q.eq('project_id', projectId)
  q = q.range(offset, offset + pageSize - 1)
  const { data, error, count } = await q
  if (error) throw error
  return { data: data || [], count: count ?? 0, page, pageSize }
}

export async function getStatusCounts(recordType, scopeFilter = {}) {
  const table = simTable(recordType)
  const { projectId } = scopeFilter
  const counts = {}
  for (const status of ['live', 'unauthorised', 'history', 'archived']) {
    let q = simDb.from(table).select('id', { count: 'exact', head: true }).eq('record_status', status)
    if (projectId) q = q.eq('project_id', projectId)
    const { count, error } = await q
    if (error) throw error
    counts[status] = count ?? 0
  }
  return counts
}

export async function getRecordLifecycleChain(recordType, rootRecordId) {
  const view = simTable(recordType) + '_all'
  const { data, error } = await simDb.from(view).select('*').eq('root_record_id', rootRecordId).order('record_version')
  if (error) {
    const table = simTable(recordType)
    const fallback = await simDb.from(table).select('*').eq('root_record_id', rootRecordId).order('record_version')
    if (fallback.error) throw fallback.error
    return fallback.data || []
  }
  return data || []
}

export async function getAuthorisationQueue(userId, { pmoView = false } = {}) {
  let q = simDb.from('record_authorisation_requests').select('*').eq('status', 'pending')
  if (!pmoView) q = q.eq('authoriser_id', userId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getSubmittedRecords(userId) {
  const { data, error } = await simDb
    .from('record_authorisation_requests')
    .select('*')
    .eq('submitted_by', userId)
  if (error) throw error
  return data || []
}

/**
 * NPC auto-approves/rejects for simulator training scenarios.
 */
export async function simulateNPCAuthorisation(requestId, scenarioRules = {}) {
  const autoApprove = scenarioRules.autoApprove !== false
  return processDecision(requestId, autoApprove ? 'approve' : 'reject', scenarioRules.notes || 'NPC decision')
}

export async function saveLifecycleConfig(accountId, projectId, tableName, config) {
  const payload = {
    account_id: accountId,
    project_id: projectId || null,
    table_name: tableName,
    approval_enabled: config.approvalEnabled ?? true,
    level_approval_mode: config.levelApprovalMode || 'any',
    history_retention_days: config.historyRetentionDays ?? null,
    auto_archive_enabled: config.autoArchiveEnabled ?? false,
    archive_retention_years: config.archiveRetentionYears ?? null,
    is_active: true,
  }
  const { data, error } = await simDb.from('record_lifecycle_config').upsert(payload).select().single()
  if (error) throw error
  return data
}

export async function saveApprovalChain(accountId, projectId, tableName, levels) {
  await simDb.from('record_authorisers').delete().eq('table_name', tableName)
  const rows = (levels || []).flatMap((level) =>
    (level.userIds || []).map((userId) => ({
      account_id: accountId,
      project_id: projectId || null,
      table_name: tableName,
      authoriser_user_id: userId,
      approval_level: level.level,
      role_label: level.roleLabel,
      is_active: true,
    }))
  )
  if (!rows.length) return []
  const { data, error } = await simDb.from('record_authorisers').insert(rows).select()
  if (error) throw error
  return data
}

export async function listArchiveOverrides(accountId) {
  const { data, error } = await simDb.from('record_archive_config').select('*').eq('account_id', accountId)
  if (error) throw error
  return data || []
}

export async function saveArchiveOverride(accountId, tableName, override, configuredBy) {
  const { data, error } = await simDb.from('record_archive_config').upsert({
    account_id: accountId,
    table_name: tableName,
    history_retention_days: override.historyRetentionDays,
    auto_archive_enabled: override.autoArchiveEnabled,
    archive_retention_years: override.archiveRetentionYears,
    override_reason: override.overrideReason,
    regulatory_reference: override.regulatoryReference,
    effective_from: override.effectiveFrom,
    effective_until: override.effectiveUntil,
    configured_by: configuredBy,
    is_active: true,
  }).select().single()
  if (error) throw error
  return data
}

export async function listLifecycleConfigs(accountId) {
  const { data, error } = await simDb.from('record_lifecycle_config').select('*').eq('account_id', accountId)
  if (error) throw error
  return data || []
}

export async function listAllAuthorisers(accountId) {
  const { data, error } = await simDb.from('record_authorisers').select('*').eq('account_id', accountId)
  if (error) throw error
  return data || []
}

export async function searchArchiveVault(searchTerm) {
  return platformService.searchArchiveVault(searchTerm)
}

export default {
  getLifecycleConfig,
  getApprovalChain,
  saveLifecycleConfig,
  saveApprovalChain,
  submitForAuthorisation,
  processDecision,
  getApprovalProgress,
  queryRecords,
  getStatusCounts,
  getRecordLifecycleChain,
  getAuthorisationQueue,
  getSubmittedRecords,
  simulateNPCAuthorisation,
  listArchiveOverrides,
  saveArchiveOverride,
  listLifecycleConfigs,
  listAllAuthorisers,
  searchArchiveVault,
}
