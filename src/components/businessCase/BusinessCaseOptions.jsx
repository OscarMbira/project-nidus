/**
 * BusinessCaseOptions
 * Displays and manages the options comparison table (Do Nothing / Do Minimum / Do Something).
 * Supports read-only (view) and edit modes.
 */

import { useState } from 'react'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { addOption, updateOption, deleteOption } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'

const OPTION_TYPES = [
  { value: 'do_nothing', label: 'Do Nothing' },
  { value: 'do_minimum', label: 'Do Minimum' },
  { value: 'do_something', label: 'Do Something' },
  { value: 'alternative', label: 'Alternative' },
]

const SEVERITY_COLORS = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-red-600 dark:text-red-400',
}

export default function BusinessCaseOptions({ caseId, options = [], readOnly = false, onRefresh }) {
  const toast = useToastContext()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newOption, setNewOption] = useState({
    option_number: options.length + 1,
    option_type: 'do_something',
    option_title: '',
    description: '',
    estimated_cost: '',
    estimated_benefits: '',
    advantages: '',
    disadvantages: '',
    risks_summary: '',
    is_recommended: false,
    display_order: options.length,
  })

  const handleAdd = async () => {
    if (!newOption.option_title.trim()) {
      toast.error('Option title is required')
      return
    }
    setSaving(true)
    try {
      await addOption(caseId, {
        ...newOption,
        estimated_cost: newOption.estimated_cost ? parseFloat(newOption.estimated_cost) : null,
      })
      toast.success('Option added')
      setAdding(false)
      setNewOption({
        option_number: options.length + 2,
        option_type: 'do_something',
        option_title: '',
        description: '',
        estimated_cost: '',
        estimated_benefits: '',
        advantages: '',
        disadvantages: '',
        risks_summary: '',
        is_recommended: false,
        display_order: options.length + 1,
      })
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to add option')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (optionId) => {
    if (!window.confirm('Delete this option?')) return
    try {
      await deleteOption(optionId)
      toast.success('Option removed')
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to delete option')
    }
  }

  const handleToggleRecommended = async (option) => {
    if (readOnly) return
    try {
      await updateOption(option.id, { is_recommended: !option.is_recommended })
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to update option')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Business Options Compared
        </h3>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3 h-3" /> Add Option
          </button>
        )}
      </div>

      {options.length === 0 && !adding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No options defined yet.{!readOnly && ' Click "Add Option" to compare alternatives.'}
        </p>
      )}

      <div className="space-y-4">
        {options.map((opt) => (
          <div
            key={opt.id}
            className={`border rounded-lg p-4 dark:border-gray-600 ${
              opt.is_recommended
                ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {OPTION_TYPES.find(t => t.value === opt.option_type)?.label || opt.option_type}
                </span>
                {opt.is_recommended && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                    <CheckCircle className="w-3 h-3" /> Recommended
                  </span>
                )}
              </div>
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRecommended(opt)}
                    className={`text-xs px-2 py-1 rounded border ${
                      opt.is_recommended
                        ? 'border-green-400 text-green-600 dark:text-green-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    } hover:opacity-80`}
                  >
                    {opt.is_recommended ? 'Unmark' : 'Mark Recommended'}
                  </button>
                  <button
                    onClick={() => handleDelete(opt.id)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{opt.option_title}</h4>

            {opt.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{opt.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {opt.estimated_cost && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Estimated Cost</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    ${parseFloat(opt.estimated_cost).toLocaleString()}
                  </p>
                </div>
              )}
              {opt.estimated_benefits && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Expected Benefits</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{opt.estimated_benefits}</p>
                </div>
              )}
              {opt.advantages && (
                <div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Advantages</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{opt.advantages}</p>
                </div>
              )}
              {opt.disadvantages && (
                <div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Disadvantages</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{opt.disadvantages}</p>
                </div>
              )}
            </div>

            {opt.risks_summary && (
              <div className="mt-2">
                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Key Risks</span>
                <p className="text-sm text-gray-800 dark:text-gray-200">{opt.risks_summary}</p>
              </div>
            )}
          </div>
        ))}

        {/* Add new option form */}
        {adding && (
          <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">New Option</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Option Type *</label>
                <select
                  value={newOption.option_type}
                  onChange={e => setNewOption(p => ({ ...p, option_type: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {OPTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Option Title *</label>
                <input
                  type="text"
                  value={newOption.option_title}
                  onChange={e => setNewOption(p => ({ ...p, option_title: e.target.value }))}
                  placeholder="e.g. Implement new CRM system"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newOption.description}
                  onChange={e => setNewOption(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Cost ($)</label>
                <input
                  type="number"
                  value={newOption.estimated_cost}
                  onChange={e => setNewOption(p => ({ ...p, estimated_cost: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Benefits</label>
                <input
                  type="text"
                  value={newOption.estimated_benefits}
                  onChange={e => setNewOption(p => ({ ...p, estimated_benefits: e.target.value }))}
                  placeholder="e.g. 20% cost reduction"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-600 dark:text-green-400 mb-1">Advantages</label>
                <textarea
                  rows={2}
                  value={newOption.advantages}
                  onChange={e => setNewOption(p => ({ ...p, advantages: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1">Disadvantages</label>
                <textarea
                  rows={2}
                  value={newOption.disadvantages}
                  onChange={e => setNewOption(p => ({ ...p, disadvantages: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Key Risks</label>
                <textarea
                  rows={2}
                  value={newOption.risks_summary}
                  onChange={e => setNewOption(p => ({ ...p, risks_summary: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recommended"
                  checked={newOption.is_recommended}
                  onChange={e => setNewOption(p => ({ ...p, is_recommended: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_recommended" className="text-sm text-gray-700 dark:text-gray-300">
                  Mark as recommended option
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Option'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
