/**
 * Risk Identification Method Form Component
 * Add/edit method form
 */

export default function MethodForm({ methodData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...methodData, [field]: value })
    }
  }

  const methodTypes = [
    { value: 'workshop', label: 'Workshop' },
    { value: 'interview', label: 'Interview' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'review', label: 'Review' },
    { value: 'expert_judgment', label: 'Expert Judgment' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmit) onSubmit()
      }}
      className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4 border border-gray-200 dark:border-gray-700"
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
            placeholder="e.g., Risk Identification Workshop"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Method Type <span className="text-red-500">*</span>
          </label>
          <select
            value={methodData.method_type || 'workshop'}
            onChange={(e) => handleChange('method_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            {methodTypes.map((type) => (
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
          value={methodData.method_description || ''}
          onChange={(e) => handleChange('method_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this risk identification method..."
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
          placeholder="When should this method be applied?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required Participants
          </label>
          <input
            type="text"
            value={methodData.participants_required || ''}
            onChange={(e) => handleChange('participants_required', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Project Manager, Team Members, Stakeholders"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency
          </label>
          <input
            type="text"
            value={methodData.frequency || ''}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Weekly, Monthly, At each stage gate"
          />
        </div>
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
          placeholder="What documentation is required?"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_mandatory"
          checked={methodData.is_mandatory || false}
          onChange={(e) => handleChange('is_mandatory', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="is_mandatory" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Mandatory method
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update Method' : 'Add Method'}
        </button>
      </div>
    </form>
  )
}
