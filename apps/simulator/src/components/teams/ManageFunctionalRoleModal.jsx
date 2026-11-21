import { useState, useEffect } from 'react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { X, Loader } from 'lucide-react'

function ManageFunctionalRoleModalBody({ isOpen, onClose, title, initialLabel = '', onSave, mode = 'add' }) {
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setLabel(initialLabel || '')
  }, [isOpen, initialLabel])

  if (!isOpen) return null

  const handleSave = async () => {
    const t = label.trim()
    if (!t) return
    setSaving(true)
    try {
      await onSave(t)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title || (mode === 'edit' ? 'Edit role label' : 'Add functional role')}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <FieldLabelWithHelp helpKey="sim.project_functional_roles.role_label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role label</FieldLabelWithHelp>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          placeholder="e.g. Developer"
          maxLength={100}
        />
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
            disabled={saving || !label.trim()}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_functional_roles.role_label',
]

export default function ManageFunctionalRoleModal(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ManageFunctionalRoleModalBody {...props} />
    </FieldHelpScope>
  )
}
