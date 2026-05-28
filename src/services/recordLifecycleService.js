/**
 * Record lifecycle service — Platform (public schema)
 * @see projectplan/v639_Record_Lifecycle_Management_Plan.md
 */

import { platformDb } from './supabase/supabaseClient'
import {
  getLifecycleTableConfig,
  LIFECYCLE_STATUSES,
} from '../config/recordLifecycleRegistry'

const db = platformDb

function resolveQueryTarget(tableName, statusFilter = ['live']) {
  const cfg = getLifecycleTableConfig(tableName)
  if (!cfg) throw new Error(`Unknown lifecycle table: ${tableName}`)

  const statuses = statusFilter?.length ? statusFilter : ['live']
  const unique = [...new Set(statuses)]

  if (cfg.category === 'B') {
    return { from: cfg.liveTable, useAllView: false, statuses: unique }
  }

  const liveOnly = unique.every((s) => s === 'live' || s === 'unauthorised')
  const historyOnly = unique.length === 1 && unique[0] === 'history'
  const archivedOnly = unique.length === 1 && unique[0] === 'archived'

  if (liveOnly) return { from: cfg.liveTable, useAllView: false, statuses: unique }
  if (historyOnly && cfg.historyTable) return { from: cfg.historyTable, useAllView: false, statuses: ['history'] }
  if (archivedOnly && cfg.archiveTable) return { from: cfg.archiveTable, useAllView: false, statuses: ['archived'] }
  if (cfg.allView) return { from: cfg.allView, useAllView: true, statuses: unique }

  return { from: cfg.liveTable, useAllView: false, statuses: unique }
}

export async function getLifecycleConfig(accountId, projectId, tableName) {
  const { data, error } = await db.rpc('get_lifecycle_config', {
    p_account_id: accountId,
    p_project_id: projectId || null,
    p_table_name: tableName,
  })
  if (error) throw error
  return data
}

export async function getApprovalChain(accountId, projectId, tableName) {
  const { data, error } = await db.rpc('get_approval_chain', {
    p_account_id: accountId,
    p_project_id: projectId || null,
    p_table_name: tableName,
  })
  if (error) throw error
  return data || []
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
    configured_by: config.configuredBy || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('record_lifecycle_config')
    .upsert(payload, { onConflict: 'account_id,project_id,table_name' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveApprovalChain(accountId, projectId, tableName, levels, createdBy) {
  const scope = { account_id: accountId, project_id: projectId || null, table_name: tableName }

  const { error: delErr } = await db
    .from('record_authorisers')
    .delete()
    .match(scope)
  if (delErr) throw delErr

  const rows = []
  for (const level of levels || []) {
    for (const userId of level.userIds || []) {
      rows.push({
        ...scope,
        authoriser_user_id: userId,
        approval_level: level.level,
        role_label: level.roleLabel || null,
        is_active: true,
        created_by: createdBy || null,
      })
    }
  }
  if (!rows.length) return []
  const { data, error } = await db.from('record_authorisers').insert(rows).select()
  if (error) throw error
  return data
}

export async function submitForAuthorisation(tableName, recordId, rootRecordId, notes) {
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await db.rpc('submit_for_authorisation', {
    p_table_name: tableName,
    p_record_id: recordId,
    p_root_record_id: rootRecordId,
    p_submitted_by: user.id,
    p_notes: notes || null,
  })
  if (error) throw error
  return data
}

export async function processDecision(requestId, decision, notes) {
  const { data, error } = await db.rpc('process_authoriser_decision', {
    p_request_id: requestId,
    p_decision: decision,
    p_notes: notes || null,
  })
  if (error) throw error
  return data
}

export async function getApprovalProgress(submissionBatchId) {
  const { data, error } = await db.rpc('get_approval_progress', {
    p_submission_batch_id: submissionBatchId,
  })
  if (error) throw error
  return data
}

export async function transitionRecordStatus(tableName, recordId, operation, notes) {
  const { data, error } = await db.rpc('transition_record_status', {
    p_table_name: tableName,
    p_record_id: recordId,
    p_operation: operation,
    p_notes: notes || null,
  })
  if (error) throw error
  return data
}

export async function archiveRecord(tableName, recordId, reason) {
  const { data, error } = await db.rpc('archive_history_record', {
    p_table_name: tableName,
    p_record_id: recordId,
    p_reason: reason || null,
  })
  if (error) throw error
  return data
}

export async function getRecordLifecycleChain(recordType, rootRecordId) {
  const { data, error } = await db.rpc('get_record_lifecycle_chain', {
    p_record_type: recordType,
    p_root_record_id: rootRecordId,
  })
  if (error) throw error
  return data || []
}

export async function getLifecycleLogs(tableName, recordId) {
  const { data, error } = await db
    .from('record_lifecycle_logs')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('performed_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAuthorisationQueue(userId, { pmoView = false } = {}) {
  let q = db
    .from('record_authorisation_requests')
    .select('*, submitter:submitted_by(full_name), authoriser:authoriser_id(full_name)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })

  if (!pmoView) q = q.eq('authoriser_id', userId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getSubmittedRecords(userId) {
  const { data, error } = await db
    .from('record_authorisation_requests')
    .select('*')
    .eq('submitted_by', userId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function queryRecords(recordType, options = {}) {
  const {
    statusFilter = ['live'],
    projectId,
    search,
    sortBy = 'created_at',
    ascending = false,
    page = 1,
    pageSize = 50,
    extraFilters = {},
  } = options

  const target = resolveQueryTarget(recordType, statusFilter)
  const cfg = getLifecycleTableConfig(recordType)
  const from = target.from
  const offset = (page - 1) * pageSize

  let q = db.from(from).select('*', { count: 'exact' })

  if (target.useAllView || cfg.category === 'B') {
    q = q.in('record_status', target.statuses)
  } else if (target.from === cfg.liveTable) {
    q = q.in('record_status', target.statuses)
  }

  if (projectId) q = q.eq('project_id', projectId)
  Object.entries(extraFilters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q = q.eq(k, v)
  })

  if (search) {
    const cols = cfg.category === 'A' && recordType === 'risks'
      ? 'risk_title,risk_description,risk_code'
      : 'title,name,description'
    q = q.or(`${cols}.ilike.%${search}%`)
  }

  q = q.order(sortBy, { ascending }).range(offset, offset + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { data: data || [], count: count ?? 0, page, pageSize }
}

export async function getStatusCounts(recordType, scopeFilter = {}) {
  const cfg = getLifecycleTableConfig(recordType)
  if (!cfg) return Object.fromEntries(LIFECYCLE_STATUSES.map((s) => [s, 0]))

  const { projectId } = scopeFilter
  const counts = {}

  async function countTable(table, status) {
    let q = db.from(table).select('id', { count: 'exact', head: true })
    if (projectId) q = q.eq('project_id', projectId)
    if (status && table === cfg.liveTable) q = q.eq('record_status', status)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  }

  counts.live = await countTable(cfg.liveTable, 'live')
  counts.unauthorised = await countTable(cfg.liveTable, 'unauthorised')

  if (cfg.historyTable) {
    counts.history = await countTable(cfg.historyTable)
  } else {
    counts.history = await countTable(cfg.liveTable, 'history')
  }

  if (cfg.archiveTable) {
    counts.archived = await countTable(cfg.archiveTable)
  } else {
    counts.archived = await countTable(cfg.liveTable, 'archived')
  }

  return counts
}

export async function saveArchiveOverride(accountId, tableName, override, configuredBy) {
  const payload = {
    account_id: accountId,
    table_name: tableName,
    history_retention_days: override.historyRetentionDays ?? null,
    auto_archive_enabled: override.autoArchiveEnabled ?? null,
    archive_retention_years: override.archiveRetentionYears ?? null,
    override_reason: override.overrideReason,
    regulatory_reference: override.regulatoryReference || null,
    effective_from: override.effectiveFrom || new Date().toISOString().slice(0, 10),
    effective_until: override.effectiveUntil || null,
    is_active: true,
    configured_by: configuredBy || null,
  }
  const { data, error } = await db
    .from('record_archive_config')
    .upsert(payload, { onConflict: 'account_id,table_name' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listArchiveOverrides(accountId) {
  const { data, error } = await db
    .from('record_archive_config')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('table_name')
  if (error) throw error
  return data || []
}

export async function removeArchiveOverride(id) {
  const { data, error } = await db
    .from('record_archive_config')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listLifecycleConfigs(accountId) {
  const { data, error } = await db
    .from('record_lifecycle_config')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('table_name')
  if (error) throw error
  return data || []
}

export async function listAllAuthorisers(accountId) {
  const { data, error } = await db
    .from('record_authorisers')
    .select('*, authoriser:authoriser_user_id(full_name, email)')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('table_name')
    .order('approval_level')
  if (error) throw error
  return data || []
}

export async function searchArchiveVault(searchTerm, { limit = 50 } = {}) {
  const cfg = getLifecycleTableConfig('risks')
  const results = []
  const { LIFECYCLE_TABLE_REGISTRY } = await import('../config/recordLifecycleRegistry')

  for (const t of LIFECYCLE_TABLE_REGISTRY) {
    const archiveTable = t.archiveTable || t.liveTable
    if (!archiveTable) continue
    const { data, error } = await db
      .from(archiveTable)
      .select('id, root_record_id, record_version, created_at')
      .limit(limit)
    if (!error && data?.length) {
      results.push({ tableName: t.tableName, label: t.label, records: data })
    }
  }

  return results.filter((r) =>
    !searchTerm || r.label.toLowerCase().includes(searchTerm.toLowerCase())
  )
}

export default {
  getLifecycleConfig,
  getApprovalChain,
  saveLifecycleConfig,
  saveApprovalChain,
  submitForAuthorisation,
  processDecision,
  getApprovalProgress,
  transitionRecordStatus,
  archiveRecord,
  queryRecords,
  getStatusCounts,
  getRecordLifecycleChain,
  getLifecycleLogs,
  getAuthorisationQueue,
  getSubmittedRecords,
  saveArchiveOverride,
  listArchiveOverrides,
  removeArchiveOverride,
  listLifecycleConfigs,
  listAllAuthorisers,
  searchArchiveVault,
}
