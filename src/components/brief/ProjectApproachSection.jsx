/**
 * Project Approach Section
 * Section 6: Solution approach
 */

export default function ProjectApproachSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          6. Project Approach
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define how the project will be delivered
        </p>
      </div>

      {/* Approach Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Approach Description <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.project_approach_description || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="project_approach_description"
              value={formData.project_approach_description || ''}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.project_approach_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="How the project will be delivered. Describe the overall approach..."
              required
            />
            {errors.project_approach_description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_approach_description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 100 characters required
            </p>
          </>
        )}
      </div>

      {/* Solution Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Solution Type
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white capitalize">
              {formData.solution_type ? formData.solution_type.replace('_', ' ') : 'Not specified'}
            </p>
          ) : (
            <select
              name="solution_type"
              value={formData.solution_type || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select...</option>
              <option value="bespoke">Bespoke</option>
              <option value="off_the_shelf">Off the Shelf</option>
              <option value="hybrid">Hybrid</option>
              <option value="customized_existing">Customized Existing</option>
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Delivery Approach
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white capitalize">
              {formData.delivery_approach ? formData.delivery_approach.replace('_', ' ') : 'Not specified'}
            </p>
          ) : (
            <select
              name="delivery_approach"
              value={formData.delivery_approach || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select...</option>
              <option value="in_house">In House</option>
              <option value="contracted">Contracted</option>
              <option value="hybrid">Hybrid</option>
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Development Approach
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white capitalize">
              {formData.development_approach ? formData.development_approach.replace('_', ' ') : 'Not specified'}
            </p>
          ) : (
            <select
              name="development_approach"
              value={formData.development_approach || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select...</option>
              <option value="new_design">New Design</option>
              <option value="modification">Modification</option>
              <option value="integration">Integration</option>
            </select>
          )}
        </div>
      </div>

      {/* Operational Environment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Operational Environment
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.operational_environment || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="operational_environment"
            value={formData.operational_environment || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Environment the solution must fit into..."
          />
        )}
      </div>

      {/* Approach Justification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Approach Justification
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.approach_justification || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="approach_justification"
            value={formData.approach_justification || ''}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Why this approach was selected. Justify the choice..."
          />
        )}
      </div>
    </div>
  )
}
