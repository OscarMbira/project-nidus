/**
 * Outline Business Case Section
 * Section 4: From mandate, expanded
 */

export default function OutlineBusinessCaseSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          4. Outline Business Case
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          High-level business justification for the project
        </p>
      </div>

      {/* Business Case Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Case Summary <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.outline_business_case_summary || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="outline_business_case_summary"
              value={formData.outline_business_case_summary || ''}
              onChange={handleChange}
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.outline_business_case_summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Reasons for the project and the business option selected. Expand on the mandate's outline business case..."
              required
            />
            {errors.outline_business_case_summary && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.outline_business_case_summary}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 100 characters required
            </p>
          </>
        )}
      </div>

      {/* Business Option Selected */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Option Selected
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white">{formData.business_option_selected || 'Not specified'}</p>
        ) : (
          <select
            name="business_option_selected"
            value={formData.business_option_selected || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select option...</option>
            <option value="do_nothing">Do Nothing</option>
            <option value="do_minimal">Do Minimal</option>
            <option value="do_something">Do Something</option>
          </select>
        )}
      </div>
    </div>
  )
}
