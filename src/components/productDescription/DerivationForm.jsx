/**
 * Derivation Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

const DERIVATION_TYPES = [
  { value: 'existing_product', label: 'Existing Product' },
  { value: 'design_specification', label: 'Design Specification' },
  { value: 'feasibility_report', label: 'Feasibility Report' },
  { value: 'requirements_document', label: 'Requirements Document' },
  { value: 'project_mandate', label: 'Project Mandate' },
  { value: 'ppd', label: 'Project Product Description' },
  { value: 'standard', label: 'Standard' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'other', label: 'Other' }
]

export default function DerivationForm({ derivation, onSubmit, onCancel, projectId }) {
  const [formData, setFormData] = useState({
    derivation_type: 'other',
    derivation_title: '',
    derivation_description: '',
    derivation_reference: '',
    linked_ppd_id: null,
    linked_ppd_composition_item_id: null,
    mandate_id: null
  })
  const [ppds, setPpds] = useState([])
  const [ppdCompositionItems, setPpdCompositionItems] = useState([])
  const [mandates, setMandates] = useState([])

  useEffect(() => {
    if (derivation) {
      setFormData({
        derivation_type: derivation.derivation_type || 'other',
        derivation_title: derivation.derivation_title || '',
        derivation_description: derivation.derivation_description || '',
        derivation_reference: derivation.derivation_reference || '',
        linked_ppd_id: derivation.linked_ppd_id || null,
        linked_ppd_composition_item_id: derivation.linked_ppd_composition_item_id || null,
        mandate_id: derivation.mandate_id || null
      })
    }
    if (projectId) {
      loadRelatedData()
    }
  }, [derivation, projectId])

  const loadRelatedData = async () => {
    try {
      const { data: ppdData } = await supabase
        .from('project_product_descriptions')
        .select('id, ppd_reference, product_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()
      setPpds(ppdData ? [ppdData] : [])

      if (ppdData) {
        const { data: compData } = await platformDb
          .from('ppd_composition_items')
          .select('id, product_name')
          .eq('ppd_id', ppdData.id)
          .eq('is_deleted', false)
        setPpdCompositionItems(compData || [])
      }

      const { data: mandateData } = await supabase
        .from('project_mandates')
        .select('id, mandate_reference, mandate_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setMandates(mandateData || [])
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.derivation_title) {
      alert('Derivation title is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Derivation Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.derivation_type}
            onChange={(e) => setFormData({ ...formData, derivation_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {DERIVATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Derivation Reference
          </label>
          <input
            type="text"
            value={formData.derivation_reference}
            onChange={(e) => setFormData({ ...formData, derivation_reference: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="External reference"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Derivation Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.derivation_title}
            onChange={(e) => setFormData({ ...formData, derivation_title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter derivation title"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.derivation_description}
            onChange={(e) => setFormData({ ...formData, derivation_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter derivation description"
          />
        </div>

        {formData.derivation_type === 'ppd' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Project Product Description
            </label>
            <select
              value={formData.linked_ppd_id || ''}
              onChange={(e) => setFormData({ ...formData, linked_ppd_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {ppds.map(ppd => (
                <option key={ppd.id} value={ppd.id}>
                  {ppd.ppd_reference} - {ppd.product_title}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.derivation_type === 'ppd' && formData.linked_ppd_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to PPD Composition Item
            </label>
            <select
              value={formData.linked_ppd_composition_item_id || ''}
              onChange={(e) => setFormData({ ...formData, linked_ppd_composition_item_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {ppdCompositionItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.product_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.derivation_type === 'project_mandate' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Project Mandate
            </label>
            <select
              value={formData.mandate_id || ''}
              onChange={(e) => setFormData({ ...formData, mandate_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {mandates.map(mandate => (
                <option key={mandate.id} value={mandate.id}>
                  {mandate.mandate_reference} - {mandate.mandate_title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {derivation ? 'Update' : 'Add'} Derivation
        </button>
      </div>
    </form>
  )
}
