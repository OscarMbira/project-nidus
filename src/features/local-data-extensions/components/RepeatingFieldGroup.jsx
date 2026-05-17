import { useCallback, useEffect, useState } from 'react'
import { useCustomFieldGroups } from '../hooks/useCustomFieldGroups'
import CustomFieldInput from './CustomFieldInput'
import { deserializeCustomFieldValue } from '../utils/mapCustomFieldValue'

export default function RepeatingFieldGroup({ platformDb, accountId, screenCode, ctx, userInternalId, readOnly }) {
  const { groups, loading, rowsByGroup, addRow, removeRow, saveCell, loadGroupFieldDefs } = useCustomFieldGroups(
    platformDb,
    accountId,
    screenCode,
    ctx,
    userInternalId
  )
  const [fieldDefsByGroup, setFieldDefsByGroup] = useState({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = {}
      for (const g of groups) {
        const defs = await loadGroupFieldDefs(g.id)
        if (!cancelled) next[g.id] = defs
      }
      if (!cancelled) setFieldDefsByGroup(next)
    })()
    return () => {
      cancelled = true
    }
  }, [groups, loadGroupFieldDefs])

  const cellValue = useCallback((instance, defId, fieldType) => {
    const row = instance.valuesByFieldId?.[defId]
    return deserializeCustomFieldValue(fieldType, row)
  }, [])

  if (loading) return <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading repeating groups…</p>
  if (!groups?.length) return null

  return (
    <div className="mt-8 space-y-8">
      {groups.map((g) => (
        <div key={g.id} className="rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{g.label}</h3>
              {g.description ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{g.description}</p>
              ) : null}
            </div>
            {!readOnly && (
              <button
                type="button"
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                onClick={() => addRow(g, (rowsByGroup[g.id]?.length || 0) + 1)}
              >
                Add row
              </button>
            )}
          </div>
          {(rowsByGroup[g.id] || []).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No rows yet.</p>
          ) : (
            <div className="space-y-4">
              {(rowsByGroup[g.id] || []).map((inst, idx) => (
                <div key={inst.id} className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Row {idx + 1}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        className="text-xs text-red-600 dark:text-red-400"
                        onClick={() => removeRow(inst.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(fieldDefsByGroup[g.id] || []).map((def) => (
                      <CustomFieldInput
                        key={def.id}
                        definition={{ ...def, options: def.options }}
                        value={cellValue(inst, def.id, def.field_type)}
                        onChange={async (v) => {
                          if (readOnly) return
                          const res = await saveCell(inst.id, def.id, def.field_type, v)
                          if (!res.success) window.alert(res.error || 'Could not save cell')
                        }}
                        disabled={readOnly}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
