import { useEffect, useState } from 'react'
import { resolveEffectiveFields } from '@nidus/shared/services/pmTemplateInheritanceService.js'
import CustomFieldRenderer from './CustomFieldRenderer'

export const WORK_PACKAGE_CATEGORY = 'work_package'
export const WORK_PACKAGE_SCREEN_CODE = 'work_package'

/**
 * Tier-inherited Work Package extra fields (v793).
 * Mirrors InheritedIssueRegisterFields / InheritedBusinessCaseFields.
 */
export default function InheritedWorkPackageFields({
  db,
  accountId,
  projectId = null,
  practiceProjectId = null,
  workPackageId,
  mode = 'edit',
  title = 'Work package additional fields',
}) {
  const [definitions, setDefinitions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!db || !accountId || !projectId) {
      setDefinitions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const resolved = await resolveEffectiveFields(db, 'project', projectId, {
          accountId,
          category: WORK_PACKAGE_CATEGORY,
        })
        const ids = (resolved.fields || [])
          .map((f) => f.custom_field_definition_id)
          .filter(Boolean)
        if (!ids.length) {
          if (!cancelled) setDefinitions([])
          return
        }
        const { data, error: defsErr } = await db
          .from('custom_field_definitions')
          .select('*')
          .in('id', ids)
          .eq('is_deleted', false)
        if (defsErr) throw defsErr
        const byId = new Map((data || []).map((d) => [d.id, d]))
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
        if (!cancelled) setDefinitions(ordered)
      } catch (e) {
        if (!cancelled) {
          setError(e.message || String(e))
          setDefinitions([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [db, accountId, projectId])

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 mt-4" role="alert">
        {error}
      </p>
    )
  }

  if (definitions === null) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading work package fields…</p>
  }

  if (!definitions.length || !workPackageId) return null

  return (
    <CustomFieldRenderer
      platformDb={db}
      accountId={accountId}
      projectId={projectId}
      practiceProjectId={practiceProjectId}
      entityType="work_package"
      entityId={workPackageId}
      screenCode={WORK_PACKAGE_SCREEN_CODE}
      mode={mode}
      title={title}
      definitionsOverride={definitions}
    />
  )
}
