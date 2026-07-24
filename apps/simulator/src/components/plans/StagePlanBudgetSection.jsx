/**
 * Stage Plan Budget Section
 */

import { SmartAmountInput } from '../ui/SmartAmountInput'

export default function StagePlanBudgetSection({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Budget</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stage Budget
          </label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contingency Amount
          </label>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Budget Breakdown (JSON)
        </label>
        <textarea
          value={formData.budget_breakdown ? JSON.stringify(formData.budget_breakdown, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('budget_breakdown', parsed)
            } catch {
              // Invalid JSON, ignore
            }
          }}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder='{"work_package_1": 5000, "work_package_2": 3000, ...}'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter budget breakdown as JSON object (e.g., by work package or category)
        </p>
      </div>
    </div>
  )
}
