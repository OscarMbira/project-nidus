/**
 * Scope Section
 * Scope, exclusions, constraints, assumptions
 */

export default function ScopeSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Project Scope
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define what is included and excluded from the project
        </p>
      </div>

      {/* Project Scope */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Scope <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.project_scope || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="project_scope"
              value={formData.project_scope || ''}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.project_scope ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="What's included in the project? Describe the major deliverables and work..."
              required
            />
            {errors.project_scope && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_scope}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 100 characters required
            </p>
          </>
        )}
      </div>

      {/* Scope Exclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Scope Exclusions
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.scope_exclusions || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="scope_exclusions"
            value={formData.scope_exclusions || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="What's explicitly NOT included in the project? Be clear about boundaries..."
          />
        )}
      </div>

      {/* Constraints */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Constraints
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.constraints || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="constraints"
            value={formData.constraints || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Limitations: resources, time, budget, regulatory, technical..."
          />
        )}
      </div>

      {/* Assumptions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assumptions
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.assumptions || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="assumptions"
            value={formData.assumptions || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="What we're assuming to be true for the project to succeed..."
          />
        )}
      </div>
    </div>
  )
}
