/**
 * Version Form Component
 * Form for creating new versions
 */

import { useState } from 'react'
import { GitBranch, Calendar } from 'lucide-react'

export default function VersionForm({ onSubmit, onCancel, saving = false }) {
  const [versionData, setVersionData] = useState({
    version_number: '',
    version_label: '',
    version_date: new Date().toISOString().split('T')[0],
    version_notes: '',
    release_notes: ''
  })
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = {}
    if (!versionData.version_number || versionData.version_number.trim() === '') {
      newErrors.version_number = 'Version number is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(versionData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={versionData.version_number}
          onChange={(e) => setVersionData({ ...versionData, version_number: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., 1.1, 2.0"
        />
        {errors.version_number && (
          <p className="text-red-500 text-sm mt-1">{errors.version_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Label
        </label>
        <input
          type="text"
          value={versionData.version_label}
          onChange={(e) => setVersionData({ ...versionData, version_label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., Beta, Release, Alpha"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={versionData.version_date}
          onChange={(e) => setVersionData({ ...versionData, version_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Notes
        </label>
        <textarea
          value={versionData.version_notes}
          onChange={(e) => setVersionData({ ...versionData, version_notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Notes about this version..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Release Notes
        </label>
        <textarea
          value={versionData.release_notes}
          onChange={(e) => setVersionData({ ...versionData, release_notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Release notes for this version..."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Version'}
        </button>
      </div>
    </form>
  )
}
