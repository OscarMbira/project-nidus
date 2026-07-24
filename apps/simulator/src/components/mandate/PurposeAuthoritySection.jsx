/**
 * PurposeAuthoritySection Component
 * Form section for Purpose (Section 1) and Authority Responsible (Section 2)
 * Works for both Platform and Simulator
 */

export default function PurposeAuthoritySection({ formData, onChange, errors = {}, isPractice = false, readOnly = false }) {
  return (
    <div className="space-y-6">
      {/* Section 1: Purpose */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          1. Purpose
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Why are we documenting this initiative?
        </p>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.purpose || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="purpose"
              value={formData.purpose || ''}
              onChange={onChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Describe the purpose of documenting this project initiative..."
              required
            />
            {errors.purpose && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purpose}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 20 characters required
            </p>
          </>
        )}
      </div>

      {/* Section 2: Authority Responsible */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          2. Authority Responsible
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Who authorizes the costs and resources for this project?
        </p>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.authority_responsible || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="authority_responsible"
              value={formData.authority_responsible || ''}
              onChange={onChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Identify the person or role responsible for authorizing this project..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional but recommended for approval
            </p>
          </>
        )}
      </div>
    </div>
  )
}
