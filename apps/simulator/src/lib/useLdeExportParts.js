/**
 * Loads Local Data Extensions values for record View/Export (v1348) — Simulator / practice.
 */
import { useEffect, useState } from 'react'
import { simDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { buildCustomFieldExportParts } from '../features/local-data-extensions/utils/exportMerge'

export function useLdeExportParts({ entityType, entityId, projectId, screenCode, enabled = true }) {
  const [section, setSection] = useState(null)
  const [mergedRecord, setMergedRecord] = useState({})

  useEffect(() => {
    let cancelled = false
    if (!enabled || !entityType || !entityId || !projectId) {
      setSection(null)
      setMergedRecord({})
      return undefined
    }
    ;(async () => {
      const accountId = await getCurrentUserAccountId()
      if (!accountId || cancelled) return
      const parts = await buildCustomFieldExportParts(
        simDb,
        accountId,
        entityType,
        entityId,
        projectId,
        projectId,
        screenCode ? { screenCode } : {},
      )
      if (cancelled) return
      setSection(parts.section)
      setMergedRecord(parts.mergedRecord || {})
    })()
    return () => { cancelled = true }
  }, [entityType, entityId, projectId, screenCode, enabled])

  return { section, mergedRecord }
}
