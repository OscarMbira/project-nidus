/**
 * Programme Create Page
 * Route: /platform/programme/create
 * Full-page inline create form (not a modal wrapper).
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, Save, User, Calendar, DollarSign, Trash2, Info } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { saveProgramme } from '../../services/programmeService'
import { getPortfolioCategories } from '../../services/portfolioCategoryService'
import { getBudgetCategories } from '../../services/budgetCategoryService'
import { getFundingSources } from '../../services/fundingSourceService'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { SmartAmountInput } from '../../components/ui/SmartAmountInput'

const EMPTY_FORM = {
  programme_code: '',
  programme_name: '',
  programme_description: '',
  programme_vision: '',
  programme_mission: '',
  programme_type: 'business_transformation',
  programme_category: '',
  programme_owner_user_id: '',
  programme_manager_user_id: '',
  programme_start_date: '',
  programme_end_date: '',
  programme_status: 'planning',
  portfolio_id: '',
  total_budget: '',
  budget_currency: 'USD',
  budget_type: '',
  governance_model: 'centralized',
  review_frequency: 'monthly',
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
      {Icon && <Icon className="h-5 w-5" />}
      {title}
    </h3>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

export default function ProgrammeCreatePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [users, setUsers] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [categories, setCategories] = useState([])
  const [budgetCategories, setBudgetCategories] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [budgetItems, setBudgetItems] = useState([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')

  const budgetTotalsByCurrency = budgetItems.reduce((acc, item) => {
    const amountNum = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)
    if (!Number.isFinite(amountNum)) return acc
    const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase()
    acc[currency] = (acc[currency] || 0) + amountNum
    return acc
  }, {})

  // Load lookup data once on mount
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [usersRes, portfoliosRes, catRes, budgetCatRes, fundingRes] = await Promise.all([
          platformDb.from('users').select('id, email, full_name').eq('is_active', true).eq('is_deleted', false).order('full_name'),
          platformDb.from('portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name'),
          getPortfolioCategories({ activeOnly: true }),
          getBudgetCategories({ activeOnly: true }),
          getFundingSources({ activeOnly: true }),
        ])
        setUsers(usersRes?.data || [])
        setPortfolios(portfoliosRes?.data || [])
        if (catRes?.success) setCategories(catRes.data || [])
        if (budgetCatRes?.success && Array.isArray(budgetCatRes.data)) setBudgetCategories(budgetCatRes.data || [])
        if (fundingRes?.success && Array.isArray(fundingRes.data)) setFundingSources(fundingRes.data || [])
      } catch (err) {
        console.error('Error loading lookups:', err)
      } finally {
        setLoadingLookups(false)
      }
    }
    fetchLookups()
  }, [])

  function addBudgetItem() {
    setBudgetItems(prev => [
      ...prev,
      { category_name: '', amount: '', currency: (formData.budget_currency || 'USD').toUpperCase(), funding_source_id: '' },
    ])
  }

  function updateBudgetItem(index, field, value) {
    setBudgetItems(prev => {
      const next = [...prev]
      const current = next[index] || { category_name: '', amount: '', currency: (formData.budget_currency || 'USD').toUpperCase(), funding_source_id: '' }
      next[index] = { ...current, [field]: value }
      return next
    })
  }

  function removeBudgetItem(index) {
    setBudgetItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleChange(e) {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { budget_type, ...rest } = formData
      const payload = {
        ...rest,
        programme_owner_user_id: formData.programme_owner_user_id || null,
        programme_manager_user_id: formData.programme_manager_user_id || null,
        portfolio_id: formData.portfolio_id || null,
        programme_start_date: formData.programme_start_date || null,
        programme_end_date: formData.programme_end_date || null,
      }

      const cleanedBudgetItems = (budgetItems || [])
        .map(item => {
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
        payload.total_budget = Number.isFinite(totalsByCurrency[baseCurrency]) ? totalsByCurrency[baseCurrency] : null
        payload.metadata = { ...(payload.metadata || {}), programme_budget_items: cleanedBudgetItems, programme_budget_type: budget_type || null }
      } else {
        payload.total_budget = formData.total_budget ? parseFloat(formData.total_budget) : null
        payload.metadata = { ...(payload.metadata || {}), programme_budget_items: [], programme_budget_type: budget_type || null }
      }

      const saved = await saveProgramme(payload)
      navigate('/platform/programme', { replace: true, state: { toast: { type: 'success', message: `Programme created. Record ID: ${saved?.id ?? 'saved'}` } } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/platform/programme')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Programme</h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tab navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic Information' },
              { id: 'ownership', label: 'Ownership & Management' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'budget', label: 'Budget' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Basic Information */}
        {activeTab === 'basic' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <SectionHeading title="Basic Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Code | Name */}
            <Field label="Programme Code">
              <input
                type="text"
                name="programme_code"
                value={formData.programme_code}
                onChange={handleChange}
                className={`${INPUT_CLS} font-mono`}
              />
            </Field>

            <Field label="Programme Name" required>
              <input
                type="text"
                name="programme_name"
                value={formData.programme_name}
                onChange={handleChange}
                required
                className={INPUT_CLS}
              />
            </Field>

            {/* Row 2: Status | Type */}
            <Field label="Status" required>
              <select name="programme_status" value={formData.programme_status} onChange={handleChange} required className={INPUT_CLS}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Programme Type" required>
              <select name="programme_type" value={formData.programme_type} onChange={handleChange} required className={INPUT_CLS}>
                <option value="business_transformation">Business Transformation</option>
                <option value="technology">Technology</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="product">Product</option>
                <option value="regulatory">Regulatory</option>
                <option value="mixed">Mixed</option>
              </select>
            </Field>

            {/* Row 3: Category | Portfolio */}
            <Field label="Category">
              <SearchableSelect
                options={categories.map(c => ({
                  value: c.code || c.name,
                  label: c.name,
                }))}
                value={formData.programme_category}
                onChange={val => setFormData(prev => ({ ...prev, programme_category: val }))}
                placeholder={loadingLookups ? 'Loading categories…' : 'Select category…'}
                searchPlaceholder="Search categories…"
              />
            </Field>

            <Field label="Portfolio (optional)">
              <SearchableSelect
                options={portfolios.map(p => ({
                  value: p.id,
                  label: `${p.portfolio_name}${p.portfolio_code ? ` (${p.portfolio_code})` : ''}`,
                }))}
                value={formData.portfolio_id}
                onChange={val => setFormData(prev => ({ ...prev, portfolio_id: val }))}
                placeholder={loadingLookups ? 'Loading portfolios…' : 'None (Independent Programme)'}
                searchPlaceholder="Search portfolios…"
              />
            </Field>

            {/* Row 4: Description (full width) */}
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  name="programme_description"
                  value={formData.programme_description}
                  onChange={handleChange}
                  rows={3}
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            {/* Row 5: Mission | Vision */}
            <Field label="Mission">
              <textarea
                name="programme_mission"
                value={formData.programme_mission}
                onChange={handleChange}
                rows={3}
                placeholder="Mission statement for this programme..."
                className={INPUT_CLS}
              />
            </Field>

            <Field label="Vision">
              <textarea
                name="programme_vision"
                value={formData.programme_vision}
                onChange={handleChange}
                rows={3}
                placeholder="Strategic vision for this programme..."
                className={INPUT_CLS}
              />
            </Field>

            {/* Governance (on Basic Information tab only) */}
            <div className="md:col-span-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Governance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Governance Model">
                  <select name="governance_model" value={formData.governance_model} onChange={handleChange} className={INPUT_CLS}>
                    <option value="centralized">Centralized</option>
                    <option value="decentralized">Decentralized</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="steering_committee">Steering Committee</option>
                  </select>
                </Field>
                <Field label="Review Frequency">
                  <select name="review_frequency" value={formData.review_frequency} onChange={handleChange} className={INPUT_CLS}>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Ownership & Management tab */}
        {activeTab === 'ownership' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <SectionHeading icon={User} title="Ownership & Management" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Programme Owner">
              <select name="programme_owner_user_id" value={formData.programme_owner_user_id} onChange={handleChange} className={INPUT_CLS} disabled={loadingLookups}>
                <option value="">{loadingLookups ? 'Loading…' : 'Select Owner'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </Field>

            <Field label="Programme Manager">
              <select name="programme_manager_user_id" value={formData.programme_manager_user_id} onChange={handleChange} className={INPUT_CLS} disabled={loadingLookups}>
                <option value="">{loadingLookups ? 'Loading…' : 'Select Manager'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </Field>

          </div>
        </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <SectionHeading icon={Calendar} title="Timeline" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Start Date">
              <input type="date" name="programme_start_date" value={formData.programme_start_date} onChange={handleChange} className={INPUT_CLS} />
            </Field>
            <Field label="End Date">
              <input type="date" name="programme_end_date" value={formData.programme_end_date} onChange={handleChange} className={INPUT_CLS} />
            </Field>
          </div>
        </div>
        )}

        {/* Budget tab – multi-line categories with currency and funding source (same as Portfolio) */}
        {activeTab === 'budget' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
          <SectionHeading icon={DollarSign} title="Budget" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reporting Currency</label>
              <select name="budget_currency" value={formData.budget_currency} onChange={handleChange} className={INPUT_CLS}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="ZWL">ZWL (Z$)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Primary reporting currency. Line items can use their own currency.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Type</label>
              <select value={formData.budget_type || ''} onChange={e => setFormData(prev => ({ ...prev, budget_type: e.target.value }))} className={INPUT_CLS}>
                <option value="">Select Budget Type...</option>
                <option value="capex">CapEx (Capital Expenditure)</option>
                <option value="opex">OpEx (Operational Expenditure)</option>
                <option value="mixed">Mixed (CapEx + OpEx)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                CapEx: capital investment. OpEx: operational costs. Mixed: both.
              </p>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget Categories</label>
              <button type="button" onClick={addBudgetItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                <DollarSign className="h-4 w-4" />
                Add category
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Add rows for each budget category (e.g. Facilities, Travel). Amounts are grouped by currency. Categories and funding sources from PMO Admin.
            </p>

            {budgetItems.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-3">Amount</div>
                  <div className="col-span-2">Currency</div>
                  <div className="col-span-2">Funding source</div>
                  <div className="col-span-1" />
                </div>
                {budgetItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <select value={row.category_name || ''} onChange={e => updateBudgetItem(index, 'category_name', e.target.value)} className={INPUT_CLS}>
                        <option value="">Select category…</option>
                        {budgetCategories.map(bc => (
                          <option key={bc.id} value={bc.name}>{bc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <SmartAmountInput
                        value={row.amount !== '' && row.amount != null ? Number(row.amount) : null}
                        onChange={num => updateBudgetItem(index, 'amount', num != null ? num : '')}
                        placeholder="0"
                        min={0}
                        inputClassName={INPUT_CLS}
                      />
                    </div>
                    <div className="col-span-2">
                      <select value={row.currency || formData.budget_currency || 'USD'} onChange={e => updateBudgetItem(index, 'currency', e.target.value)} className={INPUT_CLS}>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="ZWL">ZWL (Z$)</option>
                        <option value="ZAR">ZAR (R)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select value={row.funding_source_id || ''} onChange={e => updateBudgetItem(index, 'funding_source_id', e.target.value)} className={INPUT_CLS}>
                        <option value="">Select…</option>
                        {fundingSources.map(fs => (
                          <option key={fs.id} value={fs.id}>{fs.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 pt-2">
                      <button type="button" onClick={() => removeBudgetItem(index)} className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label={`Remove row ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {budgetItems.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">No budget categories yet. Use &quot;Add category&quot; to add lines.</p>
            )}
            {Object.keys(budgetTotalsByCurrency).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(budgetTotalsByCurrency).map(([currency, total]) => (
                  <div key={currency} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total budget ({currency}):</span>
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate('/platform/programme')}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Creating…' : 'Create Programme'}
          </button>
        </div>
      </form>
    </div>
  )
}
