import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'

export default function SimEditMemberRoleModal({ isOpen, onClose, memberLabel, assignableRoles, currentRoleName, onSave }) {
  const [roleName, setRoleName] = useState(currentRoleName || 'team_member')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setRoleName(currentRoleName || 'team_member')
  }, [isOpen, currentRoleName])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(roleName)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change role</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{memberLabel}</p>
          <select
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            {assignableRoles.map((r) => (
              <option key={r.role_name} value={r.role_name}>
                {r.role_display_name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
