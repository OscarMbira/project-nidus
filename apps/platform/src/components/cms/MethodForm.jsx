/**
 * Method Form Component
 * Add/edit communication method form
 */

export default function MethodForm({ methodData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...methodData, [field]: value })
    }
  }

  const methodTypes = [
    { value: 'inform', label: 'Inform', description: 'One-way communication' },
    { value: 'consult', label: 'Consult', description: 'Seek feedback' },
    { value: 'involve', label: 'Involve', description: 'Work together' },
    { value: 'collaborate', label: 'Collaborate', description: 'Partner in decisions' },
    { value: 'empower', label: 'Empower', description: 'Final decision-making authority' }
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
            Method Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={methodData.method_name || ''}
            onChange={(e) => handleChange('method_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Status Report, Team Meeting"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Method Type (IAP2 Spectrum) <span className="text-red-500">*</span>
          </label>
          <select
            value={methodData.method_type || ''}
            onChange={(e) => handleChange('method_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {methodTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
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
          value={methodData.method_description || ''}
          onChange={(e) => handleChange('method_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication method..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          When to Use
        </label>
        <textarea
          value={methodData.when_to_use || ''}
          onChange={(e) => handleChange('when_to_use', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="When this method should be applied..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Entry Criteria
          </label>
          <textarea
            value={methodData.entry_criteria || ''}
            onChange={(e) => handleChange('entry_criteria', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Criteria to start this method..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Exit Criteria
          </label>
          <textarea
            value={methodData.exit_criteria || ''}
            onChange={(e) => handleChange('exit_criteria', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Criteria to complete this method..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Required Participants
        </label>
        <textarea
          value={methodData.required_participants || ''}
          onChange={(e) => handleChange('required_participants', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who must participate in this method..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Documentation Required
        </label>
        <textarea
          value={methodData.documentation_required || ''}
          onChange={(e) => handleChange('documentation_required', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What to document for this method..."
        />
      </div>

      <div className="flex items-center">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={methodData.is_mandatory || false}
            onChange={(e) => handleChange('is_mandatory', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mandatory Method
          </span>
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Method
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
