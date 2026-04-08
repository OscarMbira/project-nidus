/**
 * Project Plan Budget Section
 */

import { SmartAmountInput } from '../ui/SmartAmountInput'

export default function ProjectPlanBudgetSection({ formData, onChange, errors, mode }) {
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Total Budget
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contingency Amount
          </label>
          <SmartAmountInput
            value={formData.contingency_amount || null}
            onChange={(value) => handleContingencyChange('contingency_amount', value)}
            disabled={mode === 'view'}
            placeholder="Enter contingency (e.g., 5k)"
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contingency Percentage
          </label>
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
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder='{"stage1": 10000, "stage2": 15000, ...}'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter budget breakdown as JSON object (e.g., by stage or category)
        </p>
      </div>
    </div>
  )
}
