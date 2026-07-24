import RecordStatusSelector from './RecordStatusSelector'

export default function RecordLifecycleListHeader({
  tableName,
  projectId,
  statusFilter,
  onStatusChange,
  counts,
  storageKey,
  className = '',
}) {
  return (
    <RecordStatusSelector
      storageKey={storageKey || `nidus-lifecycle-status-${tableName}${projectId ? `-${projectId}` : ''}`}
      value={statusFilter}
      onChange={onStatusChange}
      counts={counts}
      className={`mb-4 ${className}`}
    />
  )
}
