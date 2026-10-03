/**
 * Project Definition Section
 * Background, objectives, outcomes — multi-line list fields (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'

export default function ProjectDefinitionSection({ formData, onChange, errors = {}, readOnly = false }) {
  const setListField = (name, value) => {
    onChange({ target: { name, value } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Project definition
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define what the project is about, its objectives, and desired outcomes. Add one item per line.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Background <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Context from the mandate and additional detail. One point per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-definition-background"
          id="brief_background"
          value={formData.background || ''}
          onChange={(v) => setListField('background', v)}
          placeholder="e.g. Legacy FBE core banking to be replaced with Temenos T24"
          ariaLabelPrefix="background point"
          itemColumnLabel="Background point"
          disabled={readOnly}
        />
        {errors.background && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.background}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project objectives <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          SMART objectives covering time, cost, quality, scope, risk, and benefits. One per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-definition-objectives"
          id="brief_project_objectives"
          value={formData.project_objectives || ''}
          onChange={(v) => setListField('project_objectives', v)}
          placeholder="e.g. Migrate all retail accounts with zero critical data loss"
          ariaLabelPrefix="objective"
          itemColumnLabel="Objective"
          disabled={readOnly}
        />
        {errors.project_objectives && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Desired outcomes
        </label>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          What success looks like. One outcome per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-definition-outcomes"
          id="brief_desired_outcomes"
          value={formData.desired_outcomes || ''}
          onChange={(v) => setListField('desired_outcomes', v)}
          placeholder="e.g. Core banking live with zero critical defects"
          ariaLabelPrefix="outcome"
          itemColumnLabel="Outcome"
          disabled={readOnly}
        />
      </div>
    </div>
  )
}
