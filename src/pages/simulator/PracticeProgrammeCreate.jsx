/**
 * Practice Programme Create Page (Simulator)
 * Route: /simulator/practice-programme/create
 * Mirrors ProgrammeCreatePage from the Platform.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FolderTree, Save, User, Calendar, DollarSign } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import { createPracticeProgramme } from '../../services/sim/practicePortfolioService'
import { getPortfolioCategories } from '../../services/portfolioCategoryService'
import SearchableSelect from '../../components/ui/SearchableSelect'

const EMPTY_FORM = {
  programme_code: '',
  programme_name: '',
  programme_description: '',
  programme_vision: '',
  programme_type: 'business_transformation',
  programme_status: 'planning',
  programme_goals: '',
  programme_start_date: '',
  programme_end_date: '',
  total_budget: '',
  budget_currency: 'USD',
  programme_category: '',
}

const INPUT_CLS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

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

export default function PracticeProgrammeCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const portfolioId = searchParams.get('portfolioId')

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [portfolios, setPortfolios] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(portfolioId || '')
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')

  useEffect(() => {
    async function fetchLookups() {
      try {
        const [portfoliosRes, catRes] = await Promise.all([
          simDb.from('practice_portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name'),
          getPortfolioCategories({ activeOnly: true }),
        ])
        setPortfolios(portfoliosRes?.data || [])
        if (catRes?.success && Array.isArray(catRes.data)) setCategories(catRes.data || [])
      } catch (err) {
        console.error('Error loading lookups:', err)
      } finally {
        setLoadingLookups(false)
      }
    }
    fetchLookups()
  }, [])

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
      const payload = {
        ...formData,
        practice_portfolio_id: selectedPortfolioId || null,
        programme_start_date: formData.programme_start_date || null,
        programme_end_date: formData.programme_end_date || null,
        total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
      }
      const result = await createPracticeProgramme(payload)
      if (!result.success) throw new Error(result.error)
      navigate(portfolioId
        ? `/simulator/practice-programme?portfolioId=${portfolioId}`
        : '/simulator/practice-programme'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const backUrl = portfolioId
    ? `/simulator/practice-programme?portfolioId=${portfolioId}`
    : '/simulator/practice-programme'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(backUrl)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-3">
          <FolderTree className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Practice Programme</h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Basic Information tab */}
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

            {/* Row 3: Category | Portfolio — same table as Platform: portfolio_categories */}
            <Field label="Category">
              <SearchableSelect
                options={categories.map(c => ({ value: c.code || c.name, label: c.name }))}
                value={formData.programme_category}
                onChange={val => setFormData(prev => ({ ...prev, programme_category: val }))}
                placeholder={loadingLookups ? 'Loading categories…' : 'Select category…'}
                searchPlaceholder="Search categories…"
                disabled={loadingLookups}
              />
            </Field>

            <Field label="Portfolio (optional)">
              <SearchableSelect
                options={portfolios.map(p => ({
                  value: p.id,
                  label: `${p.portfolio_name}${p.portfolio_code ? ` (${p.portfolio_code})` : ''}`,
                }))}
                value={selectedPortfolioId}
                onChange={val => setSelectedPortfolioId(val)}
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

            {/* Row 5: Goals (full width) */}
            <div className="md:col-span-2">
              <Field label="Goals">
                <textarea
                  name="programme_goals"
                  value={formData.programme_goals}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Key goals and outcomes for this programme..."
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            {/* Row 6: Vision | Mission - sim has vision only, no mission field */}
            <div className="md:col-span-2">
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
            </div>
          </div>
        </div>
        )}


        {/* Timeline tab */}
        {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <SectionHeading icon={Calendar} title="Timeline" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Start Date">
              <input
                type="date"
                name="programme_start_date"
                value={formData.programme_start_date}
                onChange={handleChange}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                name="programme_end_date"
                value={formData.programme_end_date}
                onChange={handleChange}
                className={INPUT_CLS}
              />
            </Field>
          </div>
        </div>
        )}

        {/* Budget tab */}
        {activeTab === 'budget' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <SectionHeading icon={DollarSign} title="Budget" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Total Budget">
              <input
                type="number"
                name="total_budget"
                value={formData.total_budget}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Currency">
              <select name="budget_currency" value={formData.budget_currency} onChange={handleChange} className={INPUT_CLS}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
              </select>
            </Field>
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(backUrl)}
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
