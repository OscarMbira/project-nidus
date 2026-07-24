/**
 * BackgroundSection Component
 * Form section for Background (Section 3) with programme linkage
 * Works for both Platform and Simulator
 */

export default function BackgroundSection({ formData, onChange, errors = {}, isPractice = false, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        3. Background
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        What is the context and need for this project?
      </p>

      {!readOnly && (
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_standalone"
              checked={formData.is_standalone !== false}
              onChange={(e) => onChange({ target: { name: 'is_standalone', value: e.target.checked } })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Standalone project (not part of a programme)
            </span>
          </label>
        </div>
      )}

      {readOnly ? (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.background || 'Not specified'}
          </p>
          {formData.is_standalone === false && formData.programme_name && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Part of Programme:</strong> {formData.programme_name}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <textarea
            name="background"
            value={formData.background || ''}
            onChange={onChange}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.background ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="Describe the background, context, and need for this project..."
            required
          />
          {errors.background && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.background}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum 100 characters required
          </p>
        </>
      )}
    </div>
  )
}
