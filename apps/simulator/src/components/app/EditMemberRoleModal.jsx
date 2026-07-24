import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'

export default function EditMemberRoleModal({
  isOpen,
  onClose,
  memberLabel,
  roles = [],
  currentRoleId,
  onConfirm,
}) {
  const [roleId, setRoleId] = useState(currentRoleId || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setRoleId(currentRoleId || '')
  }, [isOpen, currentRoleId])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!roleId) return
    setSaving(true)
    try {
      await onConfirm(roleId)
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_display_name || r.role_name}
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
              disabled={saving || !roleId}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
