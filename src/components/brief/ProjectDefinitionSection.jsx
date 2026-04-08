/**
 * Project Definition Section
 * Section 3: Background, objectives, outcomes
 */

export default function ProjectDefinitionSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          3. Project Definition
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define what the project is about, its objectives, and desired outcomes
        </p>
      </div>

      {/* Background */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Background <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.background || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="background"
              value={formData.background || ''}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.background ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Provide context from the mandate, expanded with additional details..."
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

      {/* Project Objectives */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Objectives <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.project_objectives || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="project_objectives"
              value={formData.project_objectives || ''}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.project_objectives ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="SMART objectives covering time, cost, quality, scope, risk, and benefits..."
              required
            />
            {errors.project_objectives && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Define SMART objectives. Use the Objectives tab to add detailed SMART objectives.
            </p>
          </>
        )}
      </div>

      {/* Desired Outcomes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Desired Outcomes
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.desired_outcomes || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="desired_outcomes"
            value={formData.desired_outcomes || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="What does success look like? Describe the desired end state..."
          />
        )}
      </div>
    </div>
  )
}
