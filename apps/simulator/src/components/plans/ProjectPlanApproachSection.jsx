/**
 * Project Plan Approach Section
 */

export default function ProjectPlanApproachSection({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Planning Approach</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Approach
          </label>
          <textarea
            value={formData.planning_approach || ''}
            onChange={(e) => onChange('planning_approach', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the overall planning approach"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Assumptions
          </label>
          <textarea
            value={formData.planning_assumptions || ''}
            onChange={(e) => onChange('planning_assumptions', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="List key assumptions"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Constraints
          </label>
          <textarea
            value={formData.planning_constraints || ''}
            onChange={(e) => onChange('planning_constraints', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="List key constraints"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Principles
          </label>
          <textarea
            value={formData.planning_principles || ''}
            onChange={(e) => onChange('planning_principles', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe planning principles"
          />
        </div>
      </div>
    </div>
  )
}
