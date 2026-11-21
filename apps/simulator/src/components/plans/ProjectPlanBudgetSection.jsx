/**
 * Project Plan Budget Section
 */

import PlanListTable from '@nidus/ui/PlanListTable'
import { SmartAmountInput } from '@nidus/ui/SmartAmountInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function ProjectPlanBudgetSectionBody({ formData, onChange, errors, mode }) {
  const handleContingencyChange = (field, value) => {
    if (field === 'contingency_percentage' && formData.total_budget) {
      const amount = (parseFloat(value) / 100) * parseFloat(formData.total_budget)
      onChange('contingency_amount', amount.toFixed(2))
      onChange(field, value)
    } else if (field === 'contingency_amount' && formData.total_budget) {
      const percentage = (parseFloat(value) / parseFloat(formData.total_budget)) * 100
      onChange('contingency_percentage', percentage.toFixed(2))
      onChange(field, value)
    } else {
      onChange(field, value)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Budget</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FieldLabelWithHelp helpKey="sim.project_plans.total_budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
            Total Budget
          </FieldLabelWithHelp>
          <div className="flex items-center">
            <select
              value={formData.budget_currency || 'USD'}
              onChange={(e) => onChange('budget_currency', e.target.value)}
              disabled={mode === 'view'}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="ZAR">ZAR</option>
            </select>
            <div className="flex-1">
              <SmartAmountInput
                value={formData.total_budget || null}
                onChange={(value) => onChange('total_budget', value)}
                disabled={mode === 'view'}
                placeholder="Enter budget (e.g., 50k)"
                inputClassName="rounded-l-none border-l-0"
                min={0}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tip: Type 50k for 50,000 or 2m for 2,000,000
          </p>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="sim.project_plans.contingency_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
            Contingency Amount
          </FieldLabelWithHelp>
          <SmartAmountInput
            value={formData.contingency_amount || null}
            onChange={(value) => handleContingencyChange('contingency_amount', value)}
            disabled={mode === 'view'}
            placeholder="Enter contingency (e.g., 5k)"
            min={0}
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="sim.project_plans.contingency_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contingency Percentage
          </FieldLabelWithHelp>
          <div className="flex items-center">
            <input
              type="number"
              step="0.01"
              value={formData.contingency_percentage || ''}
              onChange={(e) => handleContingencyChange('contingency_percentage', e.target.value)}
              disabled={mode === 'view'}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
            <span className="px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              %
            </span>
          </div>
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_plans.budget_breakdown" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Budget Breakdown
        </FieldLabelWithHelp>
        <PlanListTable
          kind="project"
          listKey="budget_breakdown"
          value={formData.budget_breakdown}
          onChange={(rows) => onChange('budget_breakdown', rows)}
          disabled={mode === 'view'}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_plans.total_budget',
  'sim.project_plans.contingency_amount',
  'sim.project_plans.contingency_percentage',
  'sim.project_plans.budget_breakdown',
]

export default function ProjectPlanBudgetSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ProjectPlanBudgetSectionBody {...props} />
    </FieldHelpScope>
  )
}
