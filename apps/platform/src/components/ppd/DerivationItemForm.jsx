/**
 * Derivation Item Form Component
 * Form for adding/editing derivation items
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addDerivation, updateDerivation } from '../../services/ppdDerivationsService'
import { supabase } from '../../services/supabaseClient'

export default function DerivationItemForm({ ppdId, derivation = null, mode = 'create', projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    derivation_type: 'project_mandate',
    derivation_title: '',
    derivation_description: '',
    derivation_reference: '',
    mandate_id: null,
    linked_document_id: null,
    display_order: 0
  })
  const [mandates, setMandates] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (derivation) {
      setFormData({
        derivation_type: derivation.derivation_type || 'project_mandate',
        derivation_title: derivation.derivation_title || '',
        derivation_description: derivation.derivation_description || '',
        derivation_reference: derivation.derivation_reference || '',
        mandate_id: derivation.mandate_id || null,
        linked_document_id: derivation.linked_document_id || null,
        display_order: derivation.display_order || 0
      })
    }
    loadMandates()
  }, [derivation, projectId])

  const loadMandates = async () => {
    try {
      const { data } = await supabase
        .from('project_mandates')
        .select('id, mandate_title, mandate_reference')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      setMandates(data || [])
    } catch (error) {
      console.error('Error loading mandates:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!formData.derivation_title.trim()) {
      setErrors({ derivation_title: 'Derivation title is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addDerivation(ppdId, formData)
      } else {
        result = await updateDerivation(derivation.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving derivation: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving derivation:', error)
      alert('Error saving derivation: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Derivation' : 'Edit Derivation'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Derivation Type <span className="text-red-500">*</span>
          </label>
          <select
            name="derivation_type"
            value={formData.derivation_type}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="project_mandate">Project Mandate</option>
            <option value="existing_product">Existing Product</option>
            <option value="design_specification">Design Specification</option>
            <option value="feasibility_report">Feasibility Report</option>
            <option value="requirements_document">Requirements Document</option>
            <option value="standard">Standard</option>
            <option value="regulation">Regulation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Derivation Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="derivation_title"
            value={formData.derivation_title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter derivation title"
          />
          {errors.derivation_title && (
            <p className="mt-1 text-sm text-red-600">{errors.derivation_title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Derivation Description
          </label>
          <textarea
            name="derivation_description"
            value={formData.derivation_description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the derivation source..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Derivation Reference
          </label>
          <input
            type="text"
            name="derivation_reference"
            value={formData.derivation_reference}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="External document reference (e.g., DOC-2026-001)"
          />
        </div>

        {formData.derivation_type === 'project_mandate' && mandates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Project Mandate
            </label>
            <select
              name="mandate_id"
              value={formData.mandate_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {mandates.map(mandate => (
                <option key={mandate.id} value={mandate.id}>
                  {mandate.mandate_title} ({mandate.mandate_reference})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : mode === 'create' ? 'Add Derivation' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
