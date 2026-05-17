import { useCallback, useEffect, useState } from 'react'
import { useLdeContext } from './LocalDataExtensionsRoutes'
import { listDefinitions, upsertDefinition } from '../api/customFieldsApi'
import ValidationRuleBuilder from '../components/ValidationRuleBuilder'

export default function ValidationRulesPage() {
  const { platformDb, accountId, userInternalId } = useLdeContext()
  const [defs, setDefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [rulesDraft, setRulesDraft] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listDefinitions(platformDb, accountId)
    setDefs(res.data || [])
    setLoading(false)
  }, [platformDb, accountId])

  useEffect(() => {
    load()
  }, [load])

  const expand = (d) => {
    setExpanded(d.id)
    setRulesDraft(d.validation_rules || {})
  }

  const saveRules = async (def) => {
    const res = await upsertDefinition(
      platformDb,
      {
        ...def,
        validation_rules: rulesDraft,
      },
      userInternalId
    )
    if (!res.success) window.alert(res.error || 'Save failed')
    else {
      setExpanded(null)
      load()
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-4">
      {defs.map((d) => (
        <div key={d.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between gap-4 flex-wrap items-start">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{d.label}</div>
              <div className="text-xs text-gray-500 font-mono">{d.field_code}</div>
            </div>
            <button type="button" className="text-sm text-blue-600" onClick={() => expand(d)}>
              {expanded === d.id ? 'Collapse' : 'Edit rules'}
            </button>
          </div>
          {expanded === d.id && (
            <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <ValidationRuleBuilder rules={rulesDraft} onChange={setRulesDraft} />
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
                onClick={() => saveRules(d)}
              >
                Save validation
              </button>
            </div>
          )}
        </div>
      ))}
      {!defs.length && <p className="text-gray-500">No field definitions.</p>}
    </div>
  )
}
