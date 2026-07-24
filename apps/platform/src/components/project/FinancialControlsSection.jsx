import { useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import { SmartAmountInput } from '../ui/SmartAmountInput'

/**
 * FinancialControlsSection
 * Single-value fields (Currency, Budget Type) at top; budget categories (name + amount + funding source) with live total; Budget Approval Status at bottom.
 */
export default function FinancialControlsSection({
  formData,
  handleChange,
  errors,
  fundingSources = [],
  budgetCategories = [],
  onBudgetCategoriesChange
}) {
  const categories = Array.isArray(formData.budget_categories) ? formData.budget_categories : []

  const totalAmount = categories.reduce((sum, c) => {
    const n = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  const addCategory = () => {
    onBudgetCategoriesChange?.([...categories, { category_name: '', amount: '', funding_source_id: '' }])
  }

  const removeCategory = (index) => {
    const next = categories.filter((_, i) => i !== index)
    onBudgetCategoriesChange?.(next)
  }

  const updateCategory = (index, field, value) => {
    const next = [...categories]
    if (!next[index]) next[index] = { category_name: '', amount: '', funding_source_id: '' }
    next[index] = { ...next[index], [field]: value }
    onBudgetCategoriesChange?.(next)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
      <div className="space-y-6">
        {/* 1. Single values at top: Currency, Budget Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget_currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              id="budget_currency"
              name="budget_currency"
              value={formData.budget_currency || 'USD'}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ZWL">ZWL (Z$)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
          </div>
          <div>
            <label htmlFor="budget_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Type <span className="text-red-500">*</span>
            </label>
            <select
              id="budget_type"
              name="budget_type"
              value={formData.budget_type || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.budget_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select Budget Type...</option>
              <option value="capex">CapEx (Capital Expenditure)</option>
              <option value="opex">OpEx (Operational Expenditure)</option>
              <option value="mixed">Mixed (CapEx + OpEx)</option>
            </select>
            {errors.budget_type && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget_type}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>CapEx: capital investment. OpEx: operational costs. Mixed: both</span>
            </p>
          </div>
        </div>

        {/* 2. Budget categories: category name, amount, funding source; total (hot) */}
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
            Add rows for each budget category (e.g. Machinery, Labour). Amounts sum to total budget. Category and funding source lists are managed in PMO Admin → Budget Categories and Funding Sources.
          </p>
          {fundingSources.length === 0 && budgetCategories.length === 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-xs mb-2" role="status">
              No categories or funding sources are currently available.
              If you are running locally, ensure SQL seed scripts v269 and v272 have been executed for your database,
              or add items manually in PMO Admin → Budget Categories and Funding Sources.
            </p>
          )}

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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    >
                      <option value="">
                        {budgetCategories.length > 0 ? 'Select category...' : 'Select category... (PMO Admin → Budget Categories)'}
                      </option>
                      {budgetCategories.map((bc) => (
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
                      className={errors.budget_categories ? 'border-red-500' : ''}
                      inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={row.funding_source_id || ''}
                      onChange={(e) => updateCategory(index, 'funding_source_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
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

          {/* Total (hot field) – highlighted for visibility */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-600/60 shadow-sm">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total budget:</span>
            <span className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              {formData.budget_currency === 'USD' && '$'}
              {formData.budget_currency === 'EUR' && '€'}
              {formData.budget_currency === 'GBP' && '£'}
              {formData.budget_currency === 'ZWL' && 'Z$'}
              {formData.budget_currency === 'ZAR' && 'R'}
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {errors.budget_categories && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget_categories}</p>}
        </div>

        {/* 3. Budget Approval Status */}
        <div>
          <label htmlFor="budget_approval_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Budget Approval Status <span className="text-red-500">*</span>
          </label>
          <select
            id="budget_approval_status"
            name="budget_approval_status"
            value={formData.budget_approval_status || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.budget_approval_status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value="">Select Approval Status...</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {errors.budget_approval_status && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budget_approval_status}</p>}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Has the budget been approved by the funding authority?</span>
          </p>
        </div>
      </div>
    </div>
  )
}
