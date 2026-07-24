import { useState, useEffect, useCallback } from 'react'
import { fetchValuesForEntity, saveValueFromRuntime } from '../api/customFieldValuesApi'
import { deserializeCustomFieldValue } from '../utils/mapCustomFieldValue'

export function useCustomFieldValues(platformDb, { projectId, practiceProjectId, entityType, entityId }) {
  const [valuesByFieldId, setValuesByFieldId] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!platformDb || (!projectId && !practiceProjectId) || !entityType || !entityId) {
      setValuesByFieldId({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchValuesForEntity(platformDb, { projectId, practiceProjectId, entityType, entityId })
      if (!res.success) throw new Error(res.error || 'Failed to load values')
      const map = {}
      for (const row of res.data || []) {
        map[row.field_definition_id] = row
      }
      setValuesByFieldId(map)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [platformDb, projectId, practiceProjectId, entityType, entityId])

  useEffect(() => {
    load()
  }, [load])

  const valueFor = useCallback(
    (def) => {
      const row = valuesByFieldId[def.id]
      return deserializeCustomFieldValue(def.field_type, row)
    },
    [valuesByFieldId]
  )

  const saveOne = useCallback(
    async (ctx, definition, rawValue, userInternalId) => {
      const res = await saveValueFromRuntime(platformDb, ctx, definition, rawValue, userInternalId)
      if (!res.success) return res
      await load()
      return res
    },
    [platformDb, load]
  )

  return { valuesByFieldId, loading, error, reload: load, valueFor, saveOne }
}
