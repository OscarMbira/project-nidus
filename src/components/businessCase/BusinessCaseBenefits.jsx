/**
 * BusinessCaseBenefits
 * Manages expected benefits in the Business Case (add/view/delete).
 */

import { useState } from 'react'
import { Plus, Trash2, Target } from 'lucide-react'
import { addBenefit, deleteBenefit } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'

const BENEFIT_TYPES = [
  { value: 'financial', label: 'Financial' },
  { value: 'non_financial', label: 'Non-Financial' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'operational', label: 'Operational' },
  { value: 'reputational', label: 'Reputational' },
]

const TYPE_COLORS = {
  financial: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  non_financial: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  strategic: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  operational: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  reputational: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
}

const emptyBenefit = () => ({
  benefit_description: '',
  benefit_type: 'financial',
  measurement_method: '',
  target_value: '',
  target_date: '',
  benefit_owner: '',
  realization_timing: '',
})

export default function BusinessCaseBenefits({ caseId, benefits = [], readOnly = false, onRefresh }) {
  const toast = useToastContext()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyBenefit())

  const handleAdd = async () => {
    if (!form.benefit_description.trim()) {
      toast.error('Benefit description is required')
      return
    }
    setSaving(true)
    try {
      await addBenefit(caseId, { ...form, display_order: benefits.length })
      toast.success('Benefit added')
      setAdding(false)
      setForm(emptyBenefit())
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to add benefit')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this benefit?')) return
    try {
      await deleteBenefit(id)
      toast.success('Benefit removed')
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to remove benefit')
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-green-500" /> Expected Benefits
        </h3>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-3 h-3" /> Add Benefit
          </button>
        )}
      </div>

      {benefits.length === 0 && !adding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No benefits defined yet.</p>
      )}

      <div className="space-y-3">
        {benefits.map((b) => (
          <div
            key={b.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[b.benefit_type] || TYPE_COLORS.financial}`}>
                    {BENEFIT_TYPES.find(t => t.value === b.benefit_type)?.label}
                  </span>
                  {b.benefit_owner && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Owner: {b.benefit_owner}</span>
                  )}
                </div>
                <p className="text-sm text-gray-900 dark:text-white">{b.benefit_description}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {b.target_value && <span>Target: <strong className="text-gray-700 dark:text-gray-300">{b.target_value}</strong></span>}
                  {b.target_date && <span>By: <strong className="text-gray-700 dark:text-gray-300">{b.target_date}</strong></span>}
                  {b.realization_timing && <span>When: {b.realization_timing}</span>}
                  {b.measurement_method && <span>Measured by: {b.measurement_method}</span>}
                </div>
              </div>
              {!readOnly && (
                <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 ml-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {adding && (
          <div className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">New Benefit</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Benefit Description *</label>
                <textarea rows={2} {...field('benefit_description')} placeholder="Describe the expected benefit..."
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Benefit Type</label>
                <select {...field('benefit_type')}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {BENEFIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Benefit Owner</label>
                <input type="text" {...field('benefit_owner')} placeholder="Who is responsible for this benefit?"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Value</label>
                <input type="text" {...field('target_value')} placeholder="e.g. 20% reduction, $500K saved"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date</label>
                <input type="date" {...field('target_date')}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Measurement Method</label>
                <input type="text" {...field('measurement_method')} placeholder="How will this benefit be measured?"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Realisation Timing</label>
                <input type="text" {...field('realization_timing')} placeholder="e.g. During project, 6 months post-completion"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setAdding(false); setForm(emptyBenefit()) }}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Benefit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
