/**
 * Activity Form Component
 * Add/edit scheduled communication activity form
 */

export default function ActivityForm({ activityData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...activityData, [field]: value })
    }
  }

  const activityTypes = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'briefing', label: 'Briefing' },
    { value: 'review', label: 'Review' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'other', label: 'Other' }
  ]

  const timingOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'milestone_triggered', label: 'Milestone Triggered' },
    { value: 'risk_triggered', label: 'Risk Triggered' },
    { value: 'on_demand', label: 'On Demand' }
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
            Activity Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={activityData.activity_name || ''}
            onChange={(e) => handleChange('activity_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Weekly Status Meeting"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activity Type <span className="text-red-500">*</span>
          </label>
          <select
            value={activityData.activity_type || ''}
            onChange={(e) => handleChange('activity_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {activityTypes.map((type) => (
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
          value={activityData.activity_description || ''}
          onChange={(e) => handleChange('activity_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this communication activity..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Activity Timing <span className="text-red-500">*</span>
        </label>
        <select
          value={activityData.activity_timing || ''}
          onChange={(e) => handleChange('activity_timing', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        >
          <option value="">Select timing...</option>
          {timingOptions.map((timing) => (
            <option key={timing.value} value={timing.value}>
              {timing.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scheduled Date
          </label>
          <input
            type="date"
            value={activityData.scheduled_date || ''}
            onChange={(e) => handleChange('scheduled_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scheduled Time
          </label>
          <input
            type="time"
            value={activityData.scheduled_time || ''}
            onChange={(e) => handleChange('scheduled_time', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location/Venue
        </label>
        <input
          type="text"
          value={activityData.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Meeting room, virtual link, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Participants
        </label>
        <textarea
          value={activityData.participants || ''}
          onChange={(e) => handleChange('participants', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who should attend this activity?"
        />
      </div>

      {activityData.activity_timing !== 'scheduled' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trigger Condition
          </label>
          <textarea
            value={activityData.trigger_condition || ''}
            onChange={(e) => handleChange('trigger_condition', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="What triggers this activity? (e.g., Milestone completion, Risk escalation)"
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Activity
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
