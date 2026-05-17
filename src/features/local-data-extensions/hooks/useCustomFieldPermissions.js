import { useState, useEffect, useCallback } from 'react'
import { listPermissions } from '../api/customFieldPermissionsApi'

export function useCustomFieldPermissions(platformDb, accountId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!platformDb || !accountId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await listPermissions(platformDb, accountId)
      if (!res.success) throw new Error(res.error || 'Failed')
      setRows(res.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [platformDb, accountId])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, loading, error, reload }
}
