import { useEffect, useState } from 'react'
import { resolveEffectiveFields } from '@nidus/shared/services/pmTemplateInheritanceService.js'
import CustomFieldRenderer from './CustomFieldRenderer'

/** Tier category + LDE screen_code for Quality Management surfaces (v790 / SQL v791). */
export const QUALITY_REGISTER_CATEGORY = 'quality_register'
export const QUALITY_REVIEW_CATEGORY = 'quality_review'
export const QUALITY_INSPECTION_CATEGORY = 'quality_inspection'

export const QUALITY_TIER_SURFACES = [
  {
    category: QUALITY_REGISTER_CATEGORY,
    screenCode: QUALITY_REGISTER_CATEGORY,
    entityType: 'quality_register',
    label: 'Quality register',
  },
  {
    category: QUALITY_REVIEW_CATEGORY,
    screenCode: QUALITY_REVIEW_CATEGORY,
    entityType: 'quality_review',
    label: 'Quality reviews',
  },
  {
    category: QUALITY_INSPECTION_CATEGORY,
    screenCode: QUALITY_INSPECTION_CATEGORY,
    entityType: 'quality_inspection',
    label: 'Quality inspections',
  },
]

/**
 * Renders tier-inherited Quality extra fields for a quality entity,
 * alongside fixed quality columns (v790, mirrors InheritedIssueRegisterFields).
 * Parameterised by `category` so register / review / inspection share one component.
 */
export default function InheritedQualityFields({
  db,
  accountId,
  projectId = null,
  practiceProjectId = null,
  category,
  entityType,
  entityId,
  mode = 'edit',
  title = 'Quality additional fields',
}) {
  const [definitions, setDefinitions] = useState(null)
  const [error, setError] = useState(null)
  const screenCode = category

  useEffect(() => {
    if (!db || !accountId || !projectId || !category) {
      setDefinitions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const resolved = await resolveEffectiveFields(db, 'project', projectId, {
          accountId,
          category,
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
  }, [db, accountId, projectId, category])

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 mt-4" role="alert">
        {error}
      </p>
    )
  }

  if (definitions === null) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading quality fields…</p>
  }

  if (!definitions.length || !entityId || !entityType) return null

  return (
    <CustomFieldRenderer
      platformDb={db}
      accountId={accountId}
      projectId={projectId}
      practiceProjectId={practiceProjectId}
      entityType={entityType}
      entityId={entityId}
      screenCode={screenCode}
      mode={mode}
      title={title}
      definitionsOverride={definitions}
    />
  )
}
