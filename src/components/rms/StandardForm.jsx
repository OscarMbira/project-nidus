/**
 * Risk Standard Form Component
 * Add/edit risk standard form
 */

export default function StandardForm({ standardData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...standardData, [field]: value })
    }
  }

  const standardTypes = [
    { value: 'iso_31000', label: 'ISO 31000' },
    { value: 'pmbok', label: 'PMBOK Guide' },
    { value: 'prince2', label: 'PRINCE2' },
    { value: 'm_o_r', label: 'M_o_R (Management of Risk)' },
    { value: 'corporate', label: 'Corporate Standard' },
    { value: 'customer', label: 'Customer Standard' },
    { value: 'other', label: 'Other' }
  ]

  const complianceLevels = [
    { value: 'mandatory', label: 'Mandatory' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'optional', label: 'Optional' }
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
            Standard Code
          </label>
          <input
            type="text"
            value={standardData.standard_code || ''}
            onChange={(e) => handleChange('standard_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., ISO-31000, PMBOK-6"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Standard Type <span className="text-red-500">*</span>
          </label>
          <select
            value={standardData.standard_type || ''}
            onChange={(e) => handleChange('standard_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {standardTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Standard Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={standardData.standard_name || ''}
          onChange={(e) => handleChange('standard_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., ISO 31000:2018, PMBOK Guide 7th Edition"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={standardData.standard_description || ''}
          onChange={(e) => handleChange('standard_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this risk management standard..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Applicability
        </label>
        <textarea
          value={standardData.applicability || ''}
          onChange={(e) => handleChange('applicability', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Where this standard applies (e.g., all projects, specific project types)..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Compliance Level <span className="text-red-500">*</span>
          </label>
          <select
            value={standardData.compliance_level || 'recommended'}
            onChange={(e) => handleChange('compliance_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            {complianceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template Reference
          </label>
          <input
            type="text"
            value={standardData.template_reference || ''}
            onChange={(e) => handleChange('template_reference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Reference to template or guideline..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          External Link
        </label>
        <input
          type="url"
          value={standardData.external_link || ''}
          onChange={(e) => handleChange('external_link', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://..."
        />
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
          {isEditing ? 'Update Standard' : 'Add Standard'}
        </button>
      </div>
    </form>
  )
}
