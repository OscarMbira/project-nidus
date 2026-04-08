/**
 * Product Quality Section
 * Quality expectations, acceptance criteria
 */

export default function ProductQualitySection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Quality Expectations
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define quality standards and acceptance criteria for project products
        </p>
      </div>

      {/* Customer Quality Expectations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Customer Quality Expectations
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.customer_quality_expectations || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="customer_quality_expectations"
            value={formData.customer_quality_expectations || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Quality standards expected by the customer..."
          />
        )}
      </div>

      {/* User Acceptance Criteria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          User Acceptance Criteria
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.user_acceptance_criteria || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="user_acceptance_criteria"
            value={formData.user_acceptance_criteria || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="How users will accept the product. Define measurable acceptance criteria..."
          />
        )}
      </div>

      {/* Operations & Maintenance Criteria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Operations & Maintenance Criteria
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.operations_maintenance_criteria || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="operations_maintenance_criteria"
            value={formData.operations_maintenance_criteria || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Criteria for operations and maintenance acceptance..."
          />
        )}
      </div>
    </div>
  )
}
