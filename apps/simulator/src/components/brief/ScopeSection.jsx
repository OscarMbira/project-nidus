/**
 * Scope Section
 * Scope, exclusions, constraints, assumptions — multi-line list fields (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function ScopeSectionBody({ formData, onChange, errors = {}, readOnly = false }) {
  const setListField = (name, value) => {
    onChange({ target: { name, value } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Project scope
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define what is included and excluded from the project. Add one item per line.
        </p>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.project_scope" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>
          Project scope <span className="text-red-500">*</span>
        </FieldLabelWithHelp>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Major deliverables and work included. One item per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-scope-included"
          id="brief_project_scope"
          value={formData.project_scope || ''}
          onChange={(v) => setListField('project_scope', v)}
          placeholder="e.g. Retail deposits product configuration in Temenos T24"
          ariaLabelPrefix="scope item"
          itemColumnLabel="In scope"
          disabled={readOnly}
        />
        {errors.project_scope && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_scope}</p>
        )}
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.scope_exclusions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Scope exclusions
        </FieldLabelWithHelp>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Explicitly out of scope. One item per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-scope-exclusions"
          id="brief_scope_exclusions"
          value={formData.scope_exclusions || ''}
          onChange={(v) => setListField('scope_exclusions', v)}
          placeholder="e.g. Mobile channel redesign (separate programme)"
          ariaLabelPrefix="exclusion"
          itemColumnLabel="Exclusion"
          disabled={readOnly}
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.constraints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Constraints
        </FieldLabelWithHelp>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Limitations (resources, time, budget, regulatory, technical). One per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-scope-constraints"
          id="brief_constraints"
          value={formData.constraints || ''}
          onChange={(v) => setListField('constraints', v)}
          placeholder="e.g. Must go live before end of fiscal year"
          ariaLabelPrefix="constraint"
          itemColumnLabel="Constraint"
          disabled={readOnly}
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.assumptions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Assumptions
        </FieldLabelWithHelp>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          What must be true for the project to succeed. One per line.
        </p>
        <MultiLineListInput
          viewModeId="brief-scope-assumptions"
          id="brief_assumptions"
          value={formData.assumptions || ''}
          onChange={(v) => setListField('assumptions', v)}
          placeholder="e.g. Source system data quality meets agreed thresholds"
          ariaLabelPrefix="assumption"
          itemColumnLabel="Assumption"
          disabled={readOnly}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_briefs.project_scope',
  'sim.project_briefs.scope_exclusions',
  'sim.project_briefs.constraints',
  'sim.project_briefs.assumptions',
]

export default function ScopeSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ScopeSectionBody {...props} />
    </FieldHelpScope>
  )
}
