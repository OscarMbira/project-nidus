/**
 * RFPLineItemForm - Modal form for add/edit single line item
 */

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const PRIORITY_OPTIONS = [
  { value: 'must_have', label: 'Must Have' },
  { value: 'should_have', label: 'Should Have' },
  { value: 'nice_to_have', label: 'Nice to Have' },
  { value: 'future_consideration', label: 'Future Consideration' },
]

const REQUIREMENT_TYPE_OPTIONS = [
  { value: 'functional', label: 'Functional' },
  { value: 'non_functional', label: 'Non-Functional' },
  { value: 'technical', label: 'Technical' },
  { value: 'operational', label: 'Operational' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'integration', label: 'Integration' },
]

const emptyItem = {
  item_number: '',
  reference_number: '',
  scope_entity: '',
  business_area: '',
  description: '',
  vendor_response: '',
  priority: 'must_have',
  requirement_type: 'functional',
  is_mandatory: true,
  acceptance_criteria: '',
  estimated_effort: '',
}

export default function RFPLineItemForm({ item = null, nextItemNumber = 1, onSave, onCancel }) {
  const [form, setForm] = useState(emptyItem)

  useEffect(() => {
    if (item) {
      setForm({
        item_number: item.item_number ?? '',
        reference_number: item.reference_number ?? '',
        scope_entity: item.scope_entity ?? '',
        business_area: item.business_area ?? '',
        description: item.description ?? '',
        vendor_response: item.vendor_response ?? '',
        priority: item.priority ?? 'must_have',
        requirement_type: item.requirement_type ?? 'functional',
        is_mandatory: item.is_mandatory !== false,
        acceptance_criteria: item.acceptance_criteria ?? '',
        estimated_effort: item.estimated_effort ?? '',
      })
    } else {
      setForm({ ...emptyItem, item_number: nextItemNumber })
    }
  }, [item, nextItemNumber])

  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? e.target.checked : value
    setForm((p) => ({ ...p, [name]: val }))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const itemNum = parseInt(form.item_number, 10)
    if (isNaN(itemNum) || itemNum < 1) {
      alert('S/No must be a positive integer')
      return
    }
    if (!form.description?.trim()) {
      alert('Description is required')
      return
    }
    const payload = {
      ...form,
      item_number: itemNum,
      reference_number: form.reference_number?.trim() || null,
      scope_entity: form.scope_entity?.trim() || null,
      business_area: form.business_area?.trim() || null,
      description: form.description.trim(),
      vendor_response: form.vendor_response?.trim() || null,
      is_mandatory: !!form.is_mandatory,
      acceptance_criteria: form.acceptance_criteria?.trim() || null,
      estimated_effort: form.estimated_effort?.trim() || null,
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item ? 'Edit Line Item' : 'Add Line Item'}</h3>
          <button type="button" onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">S/No *</label>
              <input name="item_number" type="number" min={1} value={form.item_number} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference No.</label>
              <input name="reference_number" value={form.reference_number} onChange={handleChange} maxLength={100} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope/Entity</label>
              <input name="scope_entity" value={form.scope_entity} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Area</label>
              <input name="business_area" value={form.business_area} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Response/Comments</label>
            <textarea name="vendor_response" value={form.vendor_response} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {PRIORITY_OPTIONS.map((o, index) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requirement Type</label>
              <select name="requirement_type" value={form.requirement_type} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {REQUIREMENT_TYPE_OPTIONS.map((o, index) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="is_mandatory" type="checkbox" checked={form.is_mandatory} onChange={handleChange} className="rounded border-gray-300 dark:border-gray-600" />
            <label className="text-sm text-gray-700 dark:text-gray-300">Mandatory</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acceptance Criteria</label>
            <textarea name="acceptance_criteria" value={form.acceptance_criteria} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Effort</label>
            <input name="estimated_effort" value={form.estimated_effort} onChange={handleChange} placeholder="e.g. 5 days" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
