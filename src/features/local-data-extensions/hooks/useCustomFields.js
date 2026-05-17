import { useState, useEffect, useCallback } from 'react'
import { listPublishedDefinitionsForScreen } from '../api/customFieldsApi'

const cache = new Map()

export function useCustomFields(platformDb, accountId, screenCode, { cacheScope = 'platform' } = {}) {
  const [definitions, setDefinitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cacheKey = `${cacheScope}::${accountId || ''}::${screenCode || ''}`

  const reload = useCallback(async () => {
    if (!platformDb || !accountId || !screenCode) {
      setDefinitions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const hit = cache.get(cacheKey)
      if (hit && Date.now() - hit.at < 120000) {
        setDefinitions(hit.data)
        setLoading(false)
        return
      }
      const res = await listPublishedDefinitionsForScreen(platformDb, accountId, screenCode)
      if (!res.success) throw new Error(res.error || 'Failed to load fields')
      cache.set(cacheKey, { data: res.data, at: Date.now() })
      setDefinitions(res.data || [])
    } catch (e) {
      setError(e.message)
      setDefinitions([])
    } finally {
      setLoading(false)
    }
  }, [platformDb, accountId, screenCode, cacheKey, cacheScope])

  useEffect(() => {
    reload()
  }, [reload])

  return { definitions, loading, error, reload }
}

export function invalidateCustomFieldsCache(accountId, screenCode, cacheScope = 'platform') {
  cache.delete(`${cacheScope}::${accountId || ''}::${screenCode || ''}`)
}

export function invalidateAllCustomFieldsCache() {
  cache.clear()
}
