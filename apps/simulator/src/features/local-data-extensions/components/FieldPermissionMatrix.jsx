import { useState } from 'react'
import { saveFieldPermissionRow } from '../api/customFieldPermissionsApi'

export default function FieldPermissionMatrix({ platformDb, accountId, roles = [], fields = [], onSaved }) {
  const [flags, setFlags] = useState(() => ({}))
  const key = (roleId, fieldId) => `${roleId}__${fieldId}`

  const get = (roleId, fieldId, k) => flags[key(roleId, fieldId)]?.[k] ?? (k === 'can_view')

  const setFlag = (roleId, fieldId, k, v) => {
    const kk = key(roleId, fieldId)
    setFlags((prev) => ({
      ...prev,
      [kk]: { ...prev[kk], [k]: v },
    }))
  }

  const savePair = async (roleId, fieldId) => {
    const kk = key(roleId, fieldId)
    const f = flags[kk] || { can_view: true, can_edit: false }
    const res = await saveFieldPermissionRow(platformDb, {
      account_id: accountId,
      role_id: roleId,
      field_definition_id: fieldId,
      group_id: null,
      can_view: f.can_view !== false,
      can_edit: !!f.can_edit,
      can_configure: false,
      can_approve: false,
      can_publish: false,
    })
    if (!res.success) window.alert(res.error || 'Save failed')
    else onSaved?.()
  }

  if (!roles.length || !fields.length) {
    return <p className="text-sm text-gray-500">Need roles and fields.</p>
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="font-medium text-gray-900 dark:text-white mb-3">{field.label}</div>
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="flex flex-wrap items-center gap-4 text-sm">
                <span className="w-40 shrink-0 text-gray-600 dark:text-gray-300">
                  {role.role_display_name || role.role_name}
                </span>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={get(role.id, field.id, 'can_view')}
                    onChange={(e) => setFlag(role.id, field.id, 'can_view', e.target.checked)}
                  />
                  View
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={get(role.id, field.id, 'can_edit')}
                    onChange={(e) => setFlag(role.id, field.id, 'can_edit', e.target.checked)}
                  />
                  Edit values
                </label>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700"
                  onClick={() => savePair(role.id, field.id)}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
