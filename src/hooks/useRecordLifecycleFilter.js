import { useCallback, useEffect, useState } from 'react'
import { getStatusCounts } from '../../services/recordLifecycleService'

/**
 * Hook for list pages — status filter + count badges.
 */
export function useRecordLifecycleFilter(tableName, { projectId, storageKey } = {}) {
  const key = storageKey || `nidus-lifecycle-status-${tableName}`
  const [statusFilter, setStatusFilter] = useState(['live'])
  const [counts, setCounts] = useState({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) setStatusFilter(parsed)
      }
    } catch { /* ignore */ }
  }, [key])

  const refreshCounts = useCallback(async () => {
    if (!tableName) return
    try {
      const c = await getStatusCounts(tableName, { projectId })
      setCounts(c)
    } catch {
      setCounts({})
    }
  }, [tableName, projectId])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  const handleStatusChange = (next) => {
    setStatusFilter(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
  }

  return { statusFilter, setStatusFilter: handleStatusChange, counts, refreshCounts, storageKey: key }
}

export default useRecordLifecycleFilter
