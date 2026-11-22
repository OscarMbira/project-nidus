/**
 * Organisation-defined custom fields (Local Data Extensions) on a hand-built record page (v1340, wave 2b).
 * Simulator binding of apps/platform/src/components/shared-app/RecordCustomFields.jsx: definitions and
 * values live in the sim schema, keyed by the practice project; user names resolve from public.users.
 *
 * Default (alwaysShow=false): renders nothing until published fields exist.
 * alwaysShow=true (v1348 Project Setup tabs): unsaved / no-fields empty states, or the renderer.
 */
import { useEffect, useState } from 'react'
import { simDb, platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer'
import { useCustomFields } from '../../features/local-data-extensions/hooks/useCustomFields'

function EmptyPanel({ children }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-8 text-sm text-gray-600 dark:text-gray-300">
      {children}
    </div>
  )
}

export default function RecordCustomFields({
  projectId,
  entityType,
  entityId,
  screenCode,
  mode = 'edit',
  title = 'Custom Fields',
  alwaysShow = false,
}) {
  const [accountId, setAccountId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId().then((id) => { if (!cancelled) setAccountId(id) })
    return () => { cancelled = true }
  }, [])

  const { definitions, loading } = useCustomFields(simDb, accountId, screenCode, { cacheScope: 'sim' })

  if (!alwaysShow) {
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
        title={title}
      />
    )
  }

  if (!entityId) {
    return <EmptyPanel>Custom fields appear after this record is saved.</EmptyPanel>
  }

  if (!accountId || !projectId) {
    return <EmptyPanel>Custom fields are unavailable until the project context is ready.</EmptyPanel>
  }

  if (loading && !definitions?.length) {
    return <EmptyPanel>Loading custom fields…</EmptyPanel>
  }

  if (!definitions?.length) {
    return (
      <EmptyPanel>
        No custom fields are published for this screen yet. Organisation admins can add them under
        Local Data Extensions (Field Definitions / Screen Mapping).
      </EmptyPanel>
    )
  }

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
      title={title}
    />
  )
}
