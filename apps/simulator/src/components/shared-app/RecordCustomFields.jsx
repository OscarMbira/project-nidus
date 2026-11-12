/**
 * Organisation-defined custom fields (Local Data Extensions) on a hand-built record page (v1340, wave 2b).
 * Simulator binding of apps/platform/src/components/shared-app/RecordCustomFields.jsx: definitions and
 * values live in the sim schema, keyed by the practice project; user names resolve from public.users.
 * Renders nothing until the organisation has published fields for this screen.
 */
import { useEffect, useState } from 'react'
import { simDb, platformDb } from '@nidus/supabase'
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

  const { definitions } = useCustomFields(simDb, accountId, screenCode, { cacheScope: 'sim' })
  if (!accountId || !projectId || !entityId || !definitions?.length) return null

  return (
    <CustomFieldRenderer
      platformDb={simDb}
      userLookupDb={platformDb}
      accountId={accountId}
      projectId={projectId}
      practiceProjectId={projectId}
      entityType={entityType}
      entityId={entityId}
      screenCode={screenCode}
      mode={mode}
      {...(title ? { title } : {})}
    />
  )
}
