/**
 * OutlineBusinessCaseSection Component
 * Form section for Outline Business Case (Section 9)
 * Works for both Platform and Simulator
 */

export default function OutlineBusinessCaseSection({ formData, onChange, errors = {}, isPractice = false, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        9. Outline Business Case
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        High-level business justification for this project. A detailed business case will be created later.
      </p>
      {readOnly ? (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {formData.outline_business_case || 'Not specified'}
        </p>
      ) : (
        <>
          <textarea
            name="outline_business_case"
            value={formData.outline_business_case || ''}
            onChange={onChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.outline_business_case ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="Provide a high-level business justification for why this project should proceed..."
            required
          />
          {errors.outline_business_case && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.outline_business_case}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum 100 characters required. This is a high-level summary - detailed financial analysis will be in the Business Case.
          </p>
        </>
      )}
    </div>
  )
}
