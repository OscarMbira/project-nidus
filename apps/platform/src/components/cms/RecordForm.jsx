/**
 * Record Form Component
 * Add/edit communication record form
 */

export default function RecordForm({ recordData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...recordData, [field]: value })
    }
  }

  const recordTypes = [
    { value: 'communication_register', label: 'Communication Register' },
    { value: 'meeting_minutes', label: 'Meeting Minutes' },
    { value: 'presentation_slides', label: 'Presentation Slides' },
    { value: 'reports', label: 'Reports' },
    { value: 'emails', label: 'Emails' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
      className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Record Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={recordData.record_name || ''}
            onChange={(e) => handleChange('record_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Communication Register"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Record Type <span className="text-red-500">*</span>
          </label>
          <select
            value={recordData.record_type || ''}
            onChange={(e) => handleChange('record_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {recordTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={recordData.record_description || ''}
          onChange={(e) => handleChange('record_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication record..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          value={recordData.record_purpose || ''}
          onChange={(e) => handleChange('record_purpose', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What is the purpose of this record?"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Storage Location
          </label>
          <input
            type="text"
            value={recordData.storage_location || ''}
            onChange={(e) => handleChange('storage_location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Where records will be stored..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Retention Period
          </label>
          <input
            type="text"
            value={recordData.retention_period || ''}
            onChange={(e) => handleChange('retention_period', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., 7 years, Until project closure"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Access Control
        </label>
        <textarea
          value={recordData.access_control || ''}
          onChange={(e) => handleChange('access_control', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who can access these records?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Format Requirements
        </label>
        <textarea
          value={recordData.format_requirements || ''}
          onChange={(e) => handleChange('format_requirements', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Format requirements for this record..."
        />
      </div>

      <div className="flex items-center">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={recordData.is_mandatory !== undefined ? recordData.is_mandatory : true}
            onChange={(e) => handleChange('is_mandatory', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mandatory Record
          </span>
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Record
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
