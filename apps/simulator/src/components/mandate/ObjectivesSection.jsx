/**
 * ObjectivesSection Component
 * Form section for Project Objectives (Section 4)
 * Works for both Platform and Simulator
 */

export default function ObjectivesSection({ formData, onChange, errors = {}, isPractice = false, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        4. Project Objectives
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        What are the measurable objectives for this project?
      </p>
      {readOnly ? (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {formData.project_objectives || 'Not specified'}
        </p>
      ) : (
        <>
          <textarea
            name="project_objectives"
            value={formData.project_objectives || ''}
            onChange={onChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.project_objectives ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="List the measurable objectives that this project aims to achieve..."
            required
          />
          {errors.project_objectives && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum 100 characters required. Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).
          </p>
        </>
      )}
    </div>
  )
}
