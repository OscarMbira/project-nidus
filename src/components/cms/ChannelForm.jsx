/**
 * Channel Form Component
 * Add/edit communication channel form
 */

export default function ChannelForm({ channelData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...channelData, [field]: value })
    }
  }

  const channelTypes = [
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'face_to_face', label: 'Face to Face' },
    { value: 'video_call', label: 'Video Call' },
    { value: 'phone', label: 'Phone' },
    { value: 'report', label: 'Report' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'portal', label: 'Portal' },
    { value: 'intranet', label: 'Intranet' },
    { value: 'newsletter', label: 'Newsletter' },
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
            Channel Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={channelData.channel_name || ''}
            onChange={(e) => handleChange('channel_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Email, Team Meeting"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Channel Type <span className="text-red-500">*</span>
          </label>
          <select
            value={channelData.channel_type || ''}
            onChange={(e) => handleChange('channel_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {channelTypes.map((type) => (
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
          value={channelData.channel_description || ''}
          onChange={(e) => handleChange('channel_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication channel..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Applicability
        </label>
        <textarea
          value={channelData.applicability || ''}
          onChange={(e) => handleChange('applicability', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="When/where to use this channel..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Effectiveness Rating (1-5)
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={channelData.effectiveness_rating || ''}
            onChange={(e) => handleChange('effectiveness_rating', parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cost Estimate
          </label>
          <input
            type="number"
            step="0.01"
            value={channelData.cost_estimate || ''}
            onChange={(e) => handleChange('cost_estimate', parseFloat(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={channelData.is_preferred || false}
              onChange={(e) => handleChange('is_preferred', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferred Channel
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Accessibility Requirements
        </label>
        <textarea
          value={channelData.accessibility_requirements || ''}
          onChange={(e) => handleChange('accessibility_requirements', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Accessibility considerations for this channel..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Channel
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
