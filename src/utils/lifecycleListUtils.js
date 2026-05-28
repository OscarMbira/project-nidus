/**
 * Apply record_status filter to Supabase queries (Category A/B list pages).
 */
export function applyRecordStatusFilter(query, statusFilter = ['live']) {
  const statuses = statusFilter?.length ? statusFilter : ['live']
  if (statuses.length === 1) {
    return query.eq('record_status', statuses[0])
  }
  return query.in('record_status', statuses)
}

export function lifecycleStorageKey(tableName, projectId) {
  return `nidus-lifecycle-status-${tableName}${projectId ? `-${projectId}` : ''}`
}
