/**
 * BusinessCaseFinancials
 * Costs & Investment — budget categories (project Financial Controls pattern)
 * plus development/ongoing costs and investment appraisal.
 */

import { useEffect, useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import SmartAmountInput from '@nidus/ui/SmartAmountInput'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { getBudgetCategories } from '../../services/budgetCategoryService'
import { getFundingSources } from '../../services/fundingSourceService'

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

function currencyPrefix(code) {
  if (code === 'EUR') return '€'
  if (code === 'GBP') return '£'
  if (code === 'ZWL') return 'Z$'
  if (code === 'ZAR') return 'R'
  return '$'
}

export default function BusinessCaseFinancials({ data = {}, readOnly = false, onChange }) {
  const [budgetCategoryOptions, setBudgetCategoryOptions] = useState([])
  const [fundingSources, setFundingSources] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [cats, funds] = await Promise.all([
        getBudgetCategories({ activeOnly: true }),
        getFundingSources({ activeOnly: true }),
      ])
      if (cancelled) return
      if (cats?.success && Array.isArray(cats.data)) setBudgetCategoryOptions(cats.data)
      if (funds?.success && Array.isArray(funds.data)) setFundingSources(funds.data)
      else if (Array.isArray(funds)) setFundingSources(funds)
      else if (Array.isArray(funds?.data)) setFundingSources(funds.data)
    })()
    return () => { cancelled = true }
  }, [])

  const categories = Array.isArray(data.budget_categories) ? data.budget_categories : []
  const totalAmount = categories.reduce((sum, c) => {
    const n = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  const field = (key) => ({
    value: data[key] ?? '',
    onChange: (e) => onChange?.({ [key]: e.target.value }),
  })

  const amountField = (key) => ({
    value: data[key] !== '' && data[key] != null ? Number(data[key]) : null,
    onChange: (val) => onChange?.({ [key]: val }),
  })

  const setCategories = (next) => onChange?.({ budget_categories: next })

  const addCategory = () => {
    setCategories([...categories, { category_name: '', amount: '', funding_source_id: '' }])
  }

  const removeCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index))
  }

  const updateCategory = (index, key, value) => {
    const next = [...categories]
    if (!next[index]) next[index] = { category_name: '', amount: '', funding_source_id: '' }
    next[index] = { ...next[index], [key]: value }
    setCategories(next)
  }

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <ReadField label="Currency" value={data.budget_currency} />
          <ReadField label="Budget Type" value={data.budget_type} />
          <ReadField label="Budget Approval Status" value={data.budget_approval_status} />
          <ReadField label="Total Budget" value={totalAmount || null} prefix={currencyPrefix(data.budget_currency)} />
        </div>
        {categories.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Funding source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {categories.map((row, i) => {
                  const fs = fundingSources.find((f) => f.id === row.funding_source_id)
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.category_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {currencyPrefix(data.budget_currency)}
                        {Number(row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{fs?.name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="space-y-1">
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
      </div>
    )
  }

  const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      {/* Budget categories — same pattern as Project Financial Controls */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Currency</label>
            <select {...field('budget_currency')} className={inputClass}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ZWL">ZWL (Z$)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Budget Type</label>
            <select {...field('budget_type')} className={inputClass}>
              <option value="">Select Budget Type...</option>
              <option value="capex">CapEx (Capital Expenditure)</option>
              <option value="opex">OpEx (Operational Expenditure)</option>
              <option value="mixed">Mixed (CapEx + OpEx)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>CapEx: capital investment. OpEx: operational costs. Mixed: both</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Categories
            </label>
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Add category
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Add rows for each budget category. Amounts sum to total budget.
          </p>

          {categories.length > 0 && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="col-span-5">Category</div>
                <div className="col-span-3">Amount</div>
                <div className="col-span-3">Funding source</div>
                <div className="col-span-1" />
              </div>
              {categories.map((row, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <select
                      value={row.category_name || ''}
                      onChange={(e) => updateCategory(index, 'category_name', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select category...</option>
                      {budgetCategoryOptions.map((bc) => (
                        <option key={bc.id} value={bc.name}>{bc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <SmartAmountInput
                      value={row.amount !== '' && row.amount != null ? Number(row.amount) : null}
                      onChange={(num) => updateCategory(index, 'amount', num != null ? num : '')}
                      placeholder="0"
                      min={0}
                      inputClassName={inputClass}
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={row.funding_source_id || ''}
                      onChange={(e) => updateCategory(index, 'funding_source_id', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select...</option>
                      {fundingSources.map((fs) => (
                        <option key={fs.id} value={fs.id}>{fs.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 pt-2">
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove row"
                      aria-label={`Remove category ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-600/60 shadow-sm">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total budget:</span>
            <span className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              {currencyPrefix(data.budget_currency)}
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Budget Approval Status</label>
          <select {...field('budget_approval_status')} className={inputClass}>
            <option value="">Select Approval Status...</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Cost Assumptions</label>
          <MultiLineListInput
            viewModeId="bc-cost-assumptions"
            id="bc_cost_assumptions"
            value={data.cost_assumptions || ''}
            onChange={(next) => onChange?.({ cost_assumptions: next })}
            placeholder="Add a cost assumption…"
            ariaLabelPrefix="assumption"
            itemColumnLabel="Assumption"
          />
        </div>

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
    </div>
  )
}
