import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCustomFields } from '../hooks/useCustomFields'
import { useCustomFieldValues } from '../hooks/useCustomFieldValues'
import CustomFieldInput from './CustomFieldInput'
import RepeatingFieldGroup from './RepeatingFieldGroup'
import { validateSingleField } from '../utils/validateCustomField'

export default function CustomFieldRenderer({
  platformDb,
  /** Use public.users for internal user id when `platformDb` is simDb */
  userLookupDb,
  accountId,
  projectId,
  practiceProjectId,
  entityType,
  entityId,
  screenCode,
  mode = 'edit',
  title = 'Additional Local Information',
}) {
  const identityDb = userLookupDb ?? platformDb
  const cacheScope = practiceProjectId ? 'sim' : 'platform'
  const [userInternalId, setUserInternalId] = useState(null)
  const { definitions, loading: loadDef, error: errDef } = useCustomFields(platformDb, accountId, screenCode, {
    cacheScope,
  })
  const { valueFor, saveOne, reload, loading: loadVal, error: errVal } = useCustomFieldValues(platformDb, {
    projectId,
    practiceProjectId,
    entityType,
    entityId,
  })

  const [local, setLocal] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const readOnly = mode === 'view'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: auth } = await identityDb.auth.getUser()
        const aid = auth?.user?.id
        if (!aid) return
        const { data: u } = await identityDb.from('users').select('id').eq('auth_user_id', aid).maybeSingle()
        if (!cancelled) setUserInternalId(u?.id || null)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [identityDb])

  useEffect(() => {
    const next = {}
    for (const d of definitions) {
      next[d.id] = valueFor(d)
    }
    setLocal(next)
  }, [definitions, valueFor])

  const ctx = useMemo(
    () => ({ accountId, projectId, practiceProjectId, entityType, entityId }),
    [accountId, projectId, practiceProjectId, entityType, entityId]
  )

  const onSaveAll = useCallback(async () => {
    const errors = {}
    for (const d of definitions) {
      const v = local[d.id]
      const { ok, errors: es } = validateSingleField(d, v)
      if (!ok) errors[d.id] = es.join('; ')
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true)
    try {
      for (const d of definitions) {
        const res = await saveOne(ctx, d, local[d.id], userInternalId)
        if (!res.success) {
          window.alert(res.error || 'Save failed')
          return
        }
      }
      await reload()
    } finally {
      setSaving(false)
    }
  }, [definitions, local, saveOne, ctx, userInternalId, reload])

  if (!accountId || (!projectId && !practiceProjectId) || !entityId) return null

  const loading = loadDef || loadVal
  const error = errDef || errVal

  return (
    <section className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {!readOnly && definitions.length > 0 && (
          <button
            type="button"
            onClick={onSaveAll}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save local fields'}
          </button>
        )}
      </div>
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading local fields…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !definitions.length && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No published local fields for this screen.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {definitions.map((d) => (
          <CustomFieldInput
            key={d.id}
            definition={d}
            value={local[d.id]}
            onChange={(v) => setLocal((prev) => ({ ...prev, [d.id]: v }))}
            disabled={readOnly}
            error={fieldErrors[d.id]}
          />
        ))}
      </div>

      <RepeatingFieldGroup
        platformDb={platformDb}
        accountId={accountId}
        screenCode={screenCode}
        ctx={ctx}
        userInternalId={userInternalId}
        readOnly={readOnly}
      />
    </section>
  )
}
