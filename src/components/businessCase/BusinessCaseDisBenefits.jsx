/**
 * BusinessCaseDisBenefits
 * Manages negative consequences (dis-benefits) in the Business Case.
 */

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { addDisBenefit, deleteDisBenefit } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'

const SEVERITY_COLORS = {
  low: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  high: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
}

const empty = () => ({
  dis_benefit_description: '',
  impact_description: '',
  severity: 'medium',
  mitigation: '',
  affected_stakeholders: '',
})

export default function BusinessCaseDisBenefits({ caseId, disBenefits = [], readOnly = false, onRefresh }) {
  const toast = useToastContext()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(empty())

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  const handleAdd = async () => {
    if (!form.dis_benefit_description.trim()) {
      toast.error('Dis-benefit description is required')
      return
    }
    setSaving(true)
    try {
      await addDisBenefit(caseId, { ...form, display_order: disBenefits.length })
      toast.success('Dis-benefit added')
      setAdding(false)
      setForm(empty())
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to add dis-benefit')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this dis-benefit?')) return
    try {
      await deleteDisBenefit(id)
      toast.success('Dis-benefit removed')
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Failed to remove')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Dis-benefits / Negative Consequences
        </h3>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-3 h-3" /> Add Dis-benefit
          </button>
        )}
      </div>

      {disBenefits.length === 0 && !adding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No dis-benefits recorded.</p>
      )}

      <div className="space-y-3">
        {disBenefits.map((d, index) => (
          <div
            key={d.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[d.severity]}`}>
                    {d.severity?.toUpperCase()} severity
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white">{d.dis_benefit_description}</p>
                {d.impact_description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Impact: {d.impact_description}</p>
                )}
                {d.affected_stakeholders && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">Affected: {d.affected_stakeholders}</p>
                )}
                {d.mitigation && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Mitigation: {d.mitigation}</p>
                )}
              </div>
              {!readOnly && (
                <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 ml-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {adding && (
          <div className="border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/10">
            <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3">New Dis-benefit</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dis-benefit Description *</label>
                <textarea rows={2} {...field('dis_benefit_description')} placeholder="Describe the negative consequence..."
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select {...field('severity')}
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Affected Stakeholders</label>
                <input type="text" {...field('affected_stakeholders')} placeholder="Who is impacted?"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Impact Description</label>
                <textarea rows={2} {...field('impact_description')} placeholder="How will stakeholders be impacted?"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-green-600 dark:text-green-400 mb-1">Mitigation</label>
                <textarea rows={2} {...field('mitigation')} placeholder="How will this dis-benefit be managed?"
                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setAdding(false); setForm(empty()) }}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="px-3 py-1.5 text-sm rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Dis-benefit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
