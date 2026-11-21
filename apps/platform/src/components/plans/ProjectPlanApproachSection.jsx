/**
 * Project Plan Approach Section
 */

function ProjectPlanApproachSectionBody({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Planning Approach</h2>

      <div className="space-y-6">
        <div>
          <FieldLabelWithHelp helpKey="public.project_plans.planning_approach" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Approach
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.project_plans.planning_assumptions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Assumptions
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.project_plans.planning_constraints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Constraints
          </FieldLabelWithHelp>
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
          <FieldLabelWithHelp helpKey="public.project_plans.planning_principles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planning Principles
          </FieldLabelWithHelp>
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

// v1345 slice 4: field help for this component (public.project_plans.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'planning_approach', 'planning_assumptions', 'planning_constraints', 'planning_principles',
].map((name) => `public.project_plans.${name}`)

export default function ProjectPlanApproachSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ProjectPlanApproachSectionBody {...props} />
    </FieldHelpScope>
  )
}
