/**
 * Stage Plan Budget Section
 */

import PlanListTable from '@nidus/ui/PlanListTable'
import { SmartAmountInput } from '@nidus/ui/SmartAmountInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function StagePlanBudgetSectionBody({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Budget</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FieldLabelWithHelp helpKey="sim.stage_plans.stage_budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
            Stage Budget
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
                value={formData.stage_budget || null}
                onChange={(value) => onChange('stage_budget', value)}
                disabled={mode === 'view'}
                placeholder="Enter budget (e.g., 25k)"
                inputClassName="rounded-l-none border-l-0"
                min={0}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tip: Type 25k for 25,000 or 1m for 1,000,000
          </p>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="sim.stage_plans.contingency_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
            Contingency Amount
          </FieldLabelWithHelp>
          <SmartAmountInput
            value={formData.contingency_amount || null}
            onChange={(value) => onChange('contingency_amount', value)}
            disabled={mode === 'view'}
            placeholder="Enter contingency (e.g., 2k)"
            min={0}
          />
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.stage_plans.budget_breakdown" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Budget Breakdown
        </FieldLabelWithHelp>
        <PlanListTable
          kind="stage"
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
  'sim.stage_plans.stage_budget',
  'sim.stage_plans.contingency_amount',
  'sim.stage_plans.budget_breakdown',
]

export default function StagePlanBudgetSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <StagePlanBudgetSectionBody {...props} />
    </FieldHelpScope>
  )
}
