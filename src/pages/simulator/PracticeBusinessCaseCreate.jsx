/**
 * Practice Business Case Create Page
 * Multi-section form matching the Platform Business Case form.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react'
import { createPracticeBusinessCase } from '../../services/sim/practiceBusinessCaseService'

const SECTIONS = [
  { id: 'summary', label: 'Executive Summary' },
  { id: 'reasons', label: 'Reasons' },
  { id: 'options', label: 'Business Options' },
  { id: 'timescale', label: 'Timescale' },
  { id: 'financials', label: 'Costs & Investment' },
  { id: 'risks', label: 'Major Risks' },
]

const INITIAL_FORM = {
  case_title: '',
  case_description: '',
  // Reasons
  business_justification: '',
  // Options
  options_considered: [],
  recommended_option: '',
  option_justification: '',
  // Timescale
  target_start_date: '',
  target_end_date: '',
  // Financials
  estimated_cost: '',
  estimated_benefits: '',
  net_present_value: '',
  return_on_investment: '',
  payback_period_months: '',
  // Risks
  expected_risks: '',
  expected_benefits: '',
  expected_costs: '',
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export default function PracticeBusinessCaseCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [newOption, setNewOption] = useState({ title: '', description: '', is_recommended: false })

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const addOption = () => {
    if (!newOption.title.trim()) return
    const options = [...(formData.options_considered || []), { ...newOption, id: Date.now() }]
    set('options_considered', options)
    setNewOption({ title: '', description: '', is_recommended: false })
  }

  const removeOption = (idx) => {
    set('options_considered', formData.options_considered.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!formData.case_title.trim()) {
      setError('Case title is required.')
      setActiveSection(0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(String(formData.estimated_cost).replace(/,/g, '')) : null,
        estimated_benefits: formData.estimated_benefits ? parseFloat(String(formData.estimated_benefits).replace(/,/g, '')) : null,
        net_present_value: formData.net_present_value ? parseFloat(String(formData.net_present_value).replace(/,/g, '')) : null,
        return_on_investment: formData.return_on_investment ? parseFloat(String(formData.return_on_investment).replace(/,/g, '')) : null,
        payback_period_months: formData.payback_period_months ? parseInt(formData.payback_period_months) : null,
      }
      const result = await createPracticeBusinessCase(projectId || null, payload)
      if (result.success) {
        navigate(`/simulator/practice-business-cases/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create business case')
      }
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const backPath = projectId
    ? `/simulator/practice-business-cases?projectId=${projectId}`
    : '/simulator/practice-business-cases'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(backPath)}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to list
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Practice Business Case</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(i)}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeSection === i
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Section 0: Executive Summary */}
        {activeSection === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Executive Summary</h2>
            <div>
              <label className={labelCls}>Case Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.case_title}
                onChange={e => set('case_title', e.target.value)}
                placeholder="Enter a descriptive title for this business case"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Executive Summary</label>
              <textarea
                value={formData.case_description}
                onChange={e => set('case_description', e.target.value)}
                rows={5}
                placeholder="Provide a high-level summary of the business case..."
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Section 1: Reasons */}
        {activeSection === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reasons</h2>
            <div>
              <label className={labelCls}>Business Justification</label>
              <textarea
                value={formData.business_justification}
                onChange={e => set('business_justification', e.target.value)}
                rows={6}
                placeholder="Why is this project needed? What problem does it solve or opportunity does it address?"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Section 2: Options */}
        {activeSection === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Options</h2>

            {/* Add option */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Option</h3>
              <input
                type="text"
                value={newOption.title}
                onChange={e => setNewOption(p => ({ ...p, title: e.target.value }))}
                placeholder="Option title (e.g. Do Nothing, Do Minimum, Do Something)"
                className={inputCls}
              />
              <textarea
                value={newOption.description}
                onChange={e => setNewOption(p => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Option description..."
                className={inputCls}
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={newOption.is_recommended}
                    onChange={e => setNewOption(p => ({ ...p, is_recommended: e.target.checked }))}
                    className="rounded"
                  />
                  Mark as Recommended
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Add Option
                </button>
              </div>
            </div>

            {/* Options list */}
            {formData.options_considered.length > 0 && (
              <div className="space-y-2">
                {formData.options_considered.map((opt, i) => (
                  <div key={opt.id || i} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.title}</span>
                        {opt.is_recommended && (
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">Recommended</span>
                        )}
                      </div>
                      {opt.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={labelCls}>Recommended Option</label>
              <input
                type="text"
                value={formData.recommended_option}
                onChange={e => set('recommended_option', e.target.value)}
                placeholder="Which option is recommended?"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Justification for Recommendation</label>
              <textarea
                value={formData.option_justification}
                onChange={e => set('option_justification', e.target.value)}
                rows={3}
                placeholder="Why is this option recommended over the others?"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Section 3: Timescale */}
        {activeSection === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timescale</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Target Start Date</label>
                <input
                  type="date"
                  value={formData.target_start_date}
                  onChange={e => set('target_start_date', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Target End Date</label>
                <input
                  type="date"
                  value={formData.target_end_date}
                  onChange={e => set('target_end_date', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Costs & Investment */}
        {activeSection === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Costs & Investment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Estimated Cost</label>
                <input
                  type="number"
                  value={formData.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Estimated Benefits</label>
                <input
                  type="number"
                  value={formData.estimated_benefits}
                  onChange={e => set('estimated_benefits', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Net Present Value (NPV)</label>
                <input
                  type="number"
                  value={formData.net_present_value}
                  onChange={e => set('net_present_value', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Return on Investment (%)</label>
                <input
                  type="number"
                  value={formData.return_on_investment}
                  onChange={e => set('return_on_investment', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Payback Period (months)</label>
                <input
                  type="number"
                  value={formData.payback_period_months}
                  onChange={e => set('payback_period_months', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Cost Notes</label>
              <textarea
                value={formData.expected_costs}
                onChange={e => set('expected_costs', e.target.value)}
                rows={3}
                placeholder="Additional notes on costs and investment assumptions..."
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Section 5: Major Risks */}
        {activeSection === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Major Risks</h2>
            <div>
              <label className={labelCls}>Expected Risks</label>
              <textarea
                value={formData.expected_risks}
                onChange={e => set('expected_risks', e.target.value)}
                rows={5}
                placeholder="Describe the major risks associated with this project..."
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Expected Benefits</label>
              <textarea
                value={formData.expected_benefits}
                onChange={e => set('expected_benefits', e.target.value)}
                rows={4}
                placeholder="List the expected benefits from this project..."
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {activeSection > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection(s => s - 1)}
                className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            {activeSection < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveSection(s => s + 1)}
                className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Business Case'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
