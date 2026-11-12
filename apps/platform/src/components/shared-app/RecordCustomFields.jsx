/**
 * Organisation-defined custom fields (Local Data Extensions) on a hand-built record page (v1340, wave 2b).
 * Same component tree as the Risk / Issue / Change pages: resolves the organisation, then mounts
 * CustomFieldRenderer for the record's screen. Renders nothing until the organisation has published
 * fields for this screen, so pages stay unchanged for organisations that don't use custom fields.
 * Simulator copy: apps/simulator/src/components/shared-app/RecordCustomFields.jsx (sim schema binding).
 */
import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer'
import { useCustomFields } from '../../features/local-data-extensions/hooks/useCustomFields'

export default function RecordCustomFields({ projectId, entityType, entityId, screenCode, mode = 'edit', title }) {
  const [accountId, setAccountId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId().then((id) => { if (!cancelled) setAccountId(id) })
    return () => { cancelled = true }
  }, [])

  const { definitions } = useCustomFields(platformDb, accountId, screenCode)
  if (!accountId || !projectId || !entityId || !definitions?.length) return null

  return (
    <CustomFieldRenderer
      platformDb={platformDb}
      accountId={accountId}
      projectId={projectId}
      entityType={entityType}
      entityId={entityId}
      screenCode={screenCode}
      mode={mode}
      {...(title ? { title } : {})}
    />
  )
}
