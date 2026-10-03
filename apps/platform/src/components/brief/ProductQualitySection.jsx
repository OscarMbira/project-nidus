/**
 * Product Quality Section
 * Quality expectations and acceptance criteria — multi-line list fields (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'

export default function ProductQualitySection({ formData, onChange, errors = {}, readOnly = false }) {
  const setListField = (name, value) => {
    onChange({ target: { name, value } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Product quality expectations
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Quality standards and acceptance criteria for the products above. Add one item per line.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Customer quality expectations
        </label>
        <MultiLineListInput
          viewModeId="brief-quality-customer"
          id="brief_customer_quality_expectations"
          value={formData.customer_quality_expectations || ''}
          onChange={(v) => setListField('customer_quality_expectations', v)}
          placeholder="e.g. All critical transactions reconcilable within T+1"
          ariaLabelPrefix="quality expectation"
          itemColumnLabel="Expectation"
          disabled={readOnly}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          User acceptance criteria
        </label>
        <MultiLineListInput
          viewModeId="brief-quality-uac"
          id="brief_user_acceptance_criteria"
          value={formData.user_acceptance_criteria || ''}
          onChange={(v) => setListField('user_acceptance_criteria', v)}
          placeholder="e.g. UAT signed off by retail operations lead"
          ariaLabelPrefix="acceptance criterion"
          itemColumnLabel="Criterion"
          disabled={readOnly}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operations & maintenance criteria
        </label>
        <MultiLineListInput
          viewModeId="brief-quality-ops"
          id="brief_operations_maintenance_criteria"
          value={formData.operations_maintenance_criteria || ''}
          onChange={(v) => setListField('operations_maintenance_criteria', v)}
          placeholder="e.g. Run-books handed over and ops team trained"
          ariaLabelPrefix="ops criterion"
          itemColumnLabel="Criterion"
          disabled={readOnly}
        />
      </div>
    </div>
  )
}
