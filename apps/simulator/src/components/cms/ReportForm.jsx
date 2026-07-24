/**
 * Report Form Component
 * Add/edit communication report form
 */

export default function ReportForm({ reportData = {}, onChange, onCancel, onSubmit, isEditing = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...reportData, [field]: value })
    }
  }

  const reportTypes = [
    { value: 'status_report', label: 'Status Report' },
    { value: 'progress_report', label: 'Progress Report' },
    { value: 'exception_report', label: 'Exception Report' },
    { value: 'milestone_report', label: 'Milestone Report' },
    { value: 'financial_report', label: 'Financial Report' },
    { value: 'quality_report', label: 'Quality Report' },
    { value: 'risk_report', label: 'Risk Report' },
    { value: 'other', label: 'Other' }
  ]

  const frequencyOptions = [
    { value: 'continuous', label: 'Continuous' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi_weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'stage_end', label: 'Stage End' },
    { value: 'on_demand', label: 'On Demand' }
  ]

  const distributionMethods = [
    { value: 'email', label: 'Email' },
    { value: 'portal', label: 'Portal' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'hard_copy', label: 'Hard Copy' },
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
            Report Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reportData.report_name || ''}
            onChange={(e) => handleChange('report_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Weekly Status Report"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Type <span className="text-red-500">*</span>
          </label>
          <select
            value={reportData.report_type || ''}
            onChange={(e) => handleChange('report_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select type...</option>
            {reportTypes.map((type) => (
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
          value={reportData.report_description || ''}
          onChange={(e) => handleChange('report_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe this report..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reportData.report_purpose || ''}
          onChange={(e) => handleChange('report_purpose', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What is the purpose of this report?"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            value={reportData.frequency || ''}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Select frequency...</option>
            {frequencyOptions.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Distribution Method
          </label>
          <select
            value={reportData.distribution_method || ''}
            onChange={(e) => handleChange('distribution_method', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select method...</option>
            {distributionMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Audience
        </label>
        <textarea
          value={reportData.target_audience || ''}
          onChange={(e) => handleChange('target_audience', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who receives this report?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content Outline
        </label>
        <textarea
          value={reportData.content_outline || ''}
          onChange={(e) => handleChange('content_outline', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Outline the content sections of this report..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isEditing ? 'Update' : 'Add'} Report
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
