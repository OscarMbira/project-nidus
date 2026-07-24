/**
 * Tool Form Component
 * Add/edit tool/technology form
 */

export default function ToolForm({ toolData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...toolData, [field]: value })
    }
  }

  const toolTypes = [
    { value: 'software', label: 'Software' },
    { value: 'platform', label: 'Platform' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'template', label: 'Template' },
    { value: 'framework', label: 'Framework' },
    { value: 'other', label: 'Other' }
  ]

  const proficiencyLevels = [
    { value: 'none', label: 'None' },
    { value: 'basic', label: 'Basic' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
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
            Tool Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={toolData.tool_name || ''}
            onChange={(e) => handleChange('tool_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Slack, Microsoft Teams"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tool Type <span className="text-red-500">*</span>
          </label>
          <select
            value={toolData.tool_type || ''}
            onChange={(e) => handleChange('tool_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {toolTypes.map((type) => (
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
          value={toolData.tool_description || ''}
          onChange={(e) => handleChange('tool_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this tool..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          value={toolData.tool_purpose || ''}
          onChange={(e) => handleChange('tool_purpose', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What is this tool used for?"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Applicable To
        </label>
        <textarea
          value={toolData.applicable_to || ''}
          onChange={(e) => handleChange('applicable_to', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Which communication steps does this tool apply to?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Proficiency Required
          </label>
          <select
            value={toolData.proficiency_required || 'basic'}
            onChange={(e) => handleChange('proficiency_required', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {proficiencyLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cost
          </label>
          <input
            type="number"
            step="0.01"
            value={toolData.cost || ''}
            onChange={(e) => handleChange('cost', parseFloat(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={toolData.license_required || false}
              onChange={(e) => handleChange('license_required', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              License Required
            </span>
          </label>
        </div>
      </div>

      {toolData.license_required && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            License Information
          </label>
          <textarea
            value={toolData.license_info || ''}
            onChange={(e) => handleChange('license_info', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="License details..."
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          External Link
        </label>
        <input
          type="url"
          value={toolData.external_link || ''}
          onChange={(e) => handleChange('external_link', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Tool
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
