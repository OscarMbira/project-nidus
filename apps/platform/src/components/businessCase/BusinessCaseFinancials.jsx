/**
 * BusinessCaseFinancials
 * Investment Appraisal section — displays/edits NPV, ROI, payback period, costs.
 * In edit mode: all fields are editable inputs with SmartAmountInput for numeric values.
 * In read-only mode: rendered as a clean summary table.
 */

import SmartAmountInput from '../ui/SmartAmountInput'

function ReadField({ label, value, prefix = '', suffix = '' }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </span>
    </div>
  )
}

export default function BusinessCaseFinancials({ data = {}, readOnly = false, onChange }) {
  const field = (key) => ({
    value: data[key] ?? '',
    onChange: (e) => onChange?.({ [key]: e.target.value }),
  })

  const amountField = (key) => ({
    value: data[key] ?? '',
    onValueChange: (val) => onChange?.({ [key]: val }),
  })

  if (readOnly) {
    return (
      <div className="space-y-1">
        <ReadField label="Estimated Development Cost" value={data.estimated_development_cost} prefix="$" />
        <ReadField label="Estimated Ongoing Cost" value={data.estimated_ongoing_cost} prefix="$" />
        <ReadField label="Total Investment" value={
          (parseFloat(data.estimated_development_cost || 0) + parseFloat(data.estimated_ongoing_cost || 0)) || null
        } prefix="$" />
        <ReadField label="Funding Source" value={data.funding_source} />
        <ReadField label="Net Present Value (NPV)" value={data.npv} prefix="$" />
        <ReadField label="Return on Investment (ROI)" value={data.roi_percentage} suffix="%" />
        <ReadField label="Payback Period" value={data.payback_period_months} suffix=" months" />
        <ReadField label="Discount Rate" value={data.discount_rate} suffix="%" />
        {data.investment_appraisal_notes && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Appraisal Notes</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.investment_appraisal_notes}</p>
          </div>
        )}
        {data.cost_assumptions && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cost Assumptions</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.cost_assumptions}</p>
          </div>
        )}
      </div>
    )
  }

  const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Estimated Development Cost ($)</label>
        <SmartAmountInput
          {...amountField('estimated_development_cost')}
          placeholder="Enter amount (e.g. 1.5m)"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Estimated Ongoing Cost ($)</label>
        <SmartAmountInput
          {...amountField('estimated_ongoing_cost')}
          placeholder="Enter amount"
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Funding Source</label>
        <input type="text" {...field('funding_source')} placeholder="e.g. Capital budget, External grant"
          className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Cost Assumptions</label>
        <textarea rows={2} {...field('cost_assumptions')} placeholder="Any assumptions underlying the cost estimates..."
          className={inputClass} />
      </div>

      {/* Divider */}
      <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
          Investment Appraisal
        </h4>
      </div>

      <div>
        <label className={labelClass}>Net Present Value (NPV) ($)</label>
        <SmartAmountInput
          {...amountField('npv')}
          placeholder="Calculated NPV"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Return on Investment (ROI %)</label>
        <input type="number" step="0.01" {...field('roi_percentage')} placeholder="e.g. 25.5"
          className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Payback Period (months)</label>
        <input type="number" min="0" {...field('payback_period_months')} placeholder="e.g. 18"
          className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Discount Rate (%)</label>
        <input type="number" step="0.01" {...field('discount_rate')} placeholder="e.g. 5.0"
          className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Investment Appraisal Notes</label>
        <textarea rows={3} {...field('investment_appraisal_notes')}
          placeholder="Additional notes on the investment appraisal methodology and assumptions..."
          className={inputClass} />
      </div>
    </div>
  )
}
