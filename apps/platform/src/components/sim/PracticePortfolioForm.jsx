import { useState, useEffect } from 'react'
import { X, Save, FolderKanban, DollarSign, Calendar, Target, Trash2, Info } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import { createPracticePortfolio, getPracticePortfolios } from '../../services/sim/practicePortfolioService'
import { getPortfolioCategories } from '../../services/portfolioCategoryService'
import { getBudgetCategories } from '../../services/budgetCategoryService'
import { getFundingSources } from '../../services/fundingSourceService'
import { SmartAmountInput } from '../ui/SmartAmountInput'
import SearchableSelect from '../ui/SearchableSelect'

export default function PracticePortfolioForm({ onSaved, onCancel, useModalLayout = true }) {
  const [formData, setFormData] = useState({
    portfolio_code: '',
    portfolio_name: '',
    portfolio_description: '',
    portfolio_vision: '',
    portfolio_mission: '',
    portfolio_goals: [],
    portfolio_type: 'strategic',
    portfolio_category: '',
    portfolio_status: 'planning',
    parent_portfolio_id: '',
    portfolio_start_date: '',
    portfolio_end_date: '',
    total_budget: '',
    budget_currency: 'USD',
    governance_model: 'centralized',
    review_frequency: 'monthly',
    budget_type: '',
  })

  const [categories, setCategories] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [budgetCategories, setBudgetCategories] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [budgetItems, setBudgetItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('basic')

  const budgetTotalsByCurrency = budgetItems.reduce((acc, item) => {
    const amountNum = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)
    if (!Number.isFinite(amountNum)) return acc
    const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase()
    acc[currency] = (acc[currency] || 0) + amountNum
    return acc
  }, {})

  useEffect(() => {
    const init = async () => {
      try {
        setError(null)
        const { data: codeData, error: rpcError } = await simDb.rpc('generate_sim_portfolio_code')
        if (!rpcError && codeData && !formData.portfolio_code) {
          setFormData((prev) => ({ ...prev, portfolio_code: codeData }))
        }

        const [catRes, portRes, budgetCatRes, fundingRes] = await Promise.all([
          getPortfolioCategories({ activeOnly: true }),
          getPracticePortfolios(),
          getBudgetCategories({ activeOnly: true }),
          getFundingSources({ activeOnly: true }),
        ])
        if (catRes.success && Array.isArray(catRes.data)) setCategories(catRes.data || [])
        if (portRes.success && Array.isArray(portRes.data)) setPortfolios(portRes.data || [])
        if (budgetCatRes.success && Array.isArray(budgetCatRes.data)) setBudgetCategories(budgetCatRes.data || [])
        if (fundingRes.success && Array.isArray(fundingRes.data)) setFundingSources(fundingRes.data || [])
      } catch (e) {
        console.error(e)
      }
    }
    init()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'total_budget' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const addBudgetItem = () => {
    setBudgetItems((prev) => [
      ...prev,
      { category_name: '', amount: '', currency: (formData.budget_currency || 'USD').toUpperCase(), funding_source_id: '' },
    ])
  }

  const updateBudgetItem = (index, field, value) => {
    setBudgetItems((prev) => {
      const next = [...prev]
      const current = next[index] || { category_name: '', amount: '', currency: (formData.budget_currency || 'USD').toUpperCase(), funding_source_id: '' }
      next[index] = { ...current, [field]: value }
      return next
    })
  }

  const removeBudgetItem = (index) => {
    setBudgetItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.portfolio_name?.trim()) {
      setError('Portfolio name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { budget_type, ...rest } = formData
      const submitData = {
        ...rest,
        parent_portfolio_id: formData.parent_portfolio_id || null,
        portfolio_start_date: formData.portfolio_start_date || null,
        portfolio_end_date: formData.portfolio_end_date || null,
        portfolio_goals:
          Array.isArray(formData.portfolio_goals) && formData.portfolio_goals.length
            ? JSON.stringify(
                formData.portfolio_goals
                  .map((g) => (g == null ? '' : String(g).trim()))
                  .filter(Boolean)
              )
            : null,
        governance_model: formData.governance_model || null,
        review_frequency: formData.review_frequency || null,
      }

      const cleanedBudgetItems = (budgetItems || [])
        .map((item) => {
          const amountNum = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)
          const hasAmount = Number.isFinite(amountNum)
          const name = (item.category_name || '').trim()
          const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase()
          if (!name && !hasAmount) return null
          return { category_name: name, amount: hasAmount ? amountNum : null, currency, funding_source_id: item.funding_source_id || '' }
        })
        .filter(Boolean)

      if (cleanedBudgetItems.length > 0) {
        const totalsByCurrency = cleanedBudgetItems.reduce((acc, item) => {
          const curr = (item.currency || formData.budget_currency || 'USD').toUpperCase()
          const amt = typeof item.amount === 'number' ? item.amount : 0
          acc[curr] = (acc[curr] || 0) + amt
          return acc
        }, {})
        const baseCurrency = (formData.budget_currency || 'USD').toUpperCase()
        submitData.total_budget = Number.isFinite(totalsByCurrency[baseCurrency]) ? totalsByCurrency[baseCurrency] : null
        submitData.custom_fields = { portfolio_budget_items: cleanedBudgetItems, portfolio_budget_type: budget_type || null }
      } else {
        submitData.total_budget = formData.total_budget ? parseFloat(formData.total_budget) : null
        submitData.custom_fields = { portfolio_budget_items: [], portfolio_budget_type: budget_type || null }
      }

      const result = await createPracticePortfolio(submitData)
      if (!result.success) throw new Error(result.error || 'Failed to create practice portfolio')
      if (onSaved) onSaved(result.data)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Error creating practice portfolio')
    } finally {
      setSaving(false)
    }
  }

  const header = (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">Create Practice Portfolio</h2>
      </div>
      <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white" aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
  )

  const form = (
    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="border-b border-gray-700 mb-4">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'basic', label: 'Basic Information' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'budget', label: 'Budget' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap ${
                activeSection === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeSection === 'basic' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 border-b border-gray-700 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Portfolio Code</label>
              <input
                type="text"
                name="portfolio_code"
                value={formData.portfolio_code}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Portfolio Name *</label>
              <input
                type="text"
                name="portfolio_name"
                value={formData.portfolio_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status *</label>
              <select
                name="portfolio_status"
                value={formData.portfolio_status}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Portfolio Type *</label>
              <select
                name="portfolio_type"
                value={formData.portfolio_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="strategic">Strategic</option>
                <option value="operational">Operational</option>
                <option value="innovation">Innovation</option>
                <option value="compliance">Compliance</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            {/* Row: Category + Parent Portfolio */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                name="portfolio_category"
                value={formData.portfolio_category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select category…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code || cat.name}>
                    {cat.name}
                    {cat.code && cat.code !== cat.name ? ` (${cat.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">Same categories as Programmes. Manage in PMO Admin → Portfolio Categories.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Parent Portfolio (optional)</label>
              <SearchableSelect
                options={portfolios.map(p => ({
                  value: p.id,
                  label: `${p.portfolio_name}${p.portfolio_code ? ` (${p.portfolio_code})` : ''}`,
                }))}
                value={formData.parent_portfolio_id}
                onChange={(val) => setFormData(prev => ({ ...prev, parent_portfolio_id: val }))}
                placeholder="None (Top Level)"
                searchPlaceholder="Search portfolios..."
              />
              <p className="mt-1 text-[11px] text-gray-500">Assign this as a sub-portfolio under another portfolio.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <textarea
                name="portfolio_description"
                value={formData.portfolio_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Mission</label>
              <textarea
                name="portfolio_mission"
                value={formData.portfolio_mission}
                onChange={handleChange}
                rows={3}
                placeholder="Mission statement for this portfolio..."
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Vision</label>
              <textarea
                name="portfolio_vision"
                value={formData.portfolio_vision}
                onChange={handleChange}
                rows={3}
                placeholder="Strategic vision for this portfolio..."
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Governance & Hierarchy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Governance Model</label>
                  <select
                    name="governance_model"
                    value={formData.governance_model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="centralized">Centralized</option>
                    <option value="decentralized">Decentralized</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Review Frequency</label>
                  <select
                    name="review_frequency"
                    value={formData.review_frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Goals</label>
              <div className="space-y-2">
                {(!Array.isArray(formData.portfolio_goals) || formData.portfolio_goals.length === 0) && (
                  <p className="text-[11px] text-gray-500">No goals added yet. Use &quot;Add goal&quot; to capture key outcomes.</p>
                )}
                {Array.isArray(formData.portfolio_goals) &&
                  formData.portfolio_goals.map((goal, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData((prev) => {
                            const next = Array.isArray(prev.portfolio_goals) ? [...prev.portfolio_goals] : []
                            next[index] = value
                            return { ...prev, portfolio_goals: next }
                          })
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder={`Goal ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => {
                            const next = Array.isArray(prev.portfolio_goals) ? [...prev.portfolio_goals] : []
                            next.splice(index, 1)
                            return { ...prev, portfolio_goals: next }
                          })
                        }
                        className="px-3 py-2 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      portfolio_goals: [...(Array.isArray(prev.portfolio_goals) ? prev.portfolio_goals : []), ''],
                    }))
                  }
                  className="px-3 py-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'timeline' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                name="portfolio_start_date"
                value={formData.portfolio_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                name="portfolio_end_date"
                value={formData.portfolio_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'budget' && (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-gray-200 border-b border-gray-700 pb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Budget
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Reporting Currency</label>
              <select
                name="budget_currency"
                value={formData.budget_currency}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="ZWL">ZWL (Z$)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Budget Type</label>
              <select
                value={formData.budget_type || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, budget_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Budget Type...</option>
                <option value="capex">CapEx (Capital Expenditure)</option>
                <option value="opex">OpEx (Operational Expenditure)</option>
                <option value="mixed">Mixed (CapEx + OpEx)</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                CapEx: capital investment. OpEx: operational costs. Mixed: both.
              </p>
            </div>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-400">Budget Categories</label>
              <button
                type="button"
                onClick={addBudgetItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                <DollarSign className="h-4 w-4" />
                Add category
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Add rows for each budget category. Categories and funding sources use the same PMO Admin lookups as the Platform.
            </p>
            {budgetItems.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-3">Amount</div>
                  <div className="col-span-2">Currency</div>
                  <div className="col-span-2">Funding source</div>
                  <div className="col-span-1" />
                </div>
                {budgetItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <select
                        value={row.category_name || ''}
                        onChange={(e) => updateBudgetItem(index, 'category_name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select category…</option>
                        {budgetCategories.map((bc) => (
                          <option key={bc.id} value={bc.name}>
                            {bc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <SmartAmountInput
                        value={row.amount !== '' && row.amount != null ? Number(row.amount) : null}
                        onChange={(num) => updateBudgetItem(index, 'amount', num != null ? num : '')}
                        placeholder="0"
                        min={0}
                        inputClassName="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={row.currency || formData.budget_currency || 'USD'}
                        onChange={(e) => updateBudgetItem(index, 'currency', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="ZWL">ZWL (Z$)</option>
                        <option value="ZAR">ZAR (R)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={row.funding_source_id || ''}
                        onChange={(e) => updateBudgetItem(index, 'funding_source_id', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select…</option>
                        {fundingSources.map((fs) => (
                          <option key={fs.id} value={fs.id}>
                            {fs.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 pt-2">
                      <button
                        type="button"
                        onClick={() => removeBudgetItem(index)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                        aria-label={`Remove row ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {budgetItems.length === 0 && (
              <p className="text-[11px] text-gray-500">No budget categories yet. Use &quot;Add category&quot; to add lines.</p>
            )}
            {Object.keys(budgetTotalsByCurrency).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(budgetTotalsByCurrency).map(([currency, total]) => (
                  <div
                    key={currency}
                    className="flex items-center gap-2 p-3 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-200"
                  >
                    <span className="text-sm font-medium">Total budget ({currency}):</span>
                    <span className="font-semibold">
                      {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Portfolio'}
        </button>
      </div>
    </form>
  )

  if (useModalLayout) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {header}
          {form}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900 rounded-xl border border-gray-700 w-full overflow-hidden">
          {header}
          {form}
        </div>
      </div>
    </div>
  )
}
