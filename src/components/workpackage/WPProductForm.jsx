/**
 * Work Package Product Form Component
 * Form for adding/editing Work Package products
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addProduct, updateProduct } from '../../services/wpProductsService'
import { supabase } from '../../services/supabaseClient'

export default function WPProductForm({ wpId, product = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    product_type: 'deliverable',
    linked_product_deliverable_id: null,
    linked_product_description_id: null,
    quality_criteria: '',
    acceptance_criteria: '',
    delivery_status: 'not_started',
    delivery_date: '',
    acceptance_date: '',
    display_order: 0
  })
  const [deliverables, setDeliverables] = useState([])
  const [productDescriptions, setProductDescriptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        product_description: product.product_description || '',
        product_type: product.product_type || 'deliverable',
        linked_product_deliverable_id: product.linked_product_deliverable_id || null,
        linked_product_description_id: product.linked_product_description_id || null,
        quality_criteria: product.quality_criteria || '',
        acceptance_criteria: product.acceptance_criteria || '',
        delivery_status: product.delivery_status || 'not_started',
        delivery_date: product.delivery_date ? product.delivery_date.split('T')[0] : '',
        acceptance_date: product.acceptance_date ? product.acceptance_date.split('T')[0] : '',
        display_order: product.display_order || 0
      })
    }
    loadRelatedData()
  }, [product, wpId])

  const loadRelatedData = async () => {
    try {
      // Get project_id from work package
      const { data: wp } = await supabase
        .from('work_packages')
        .select('project_id')
        .eq('id', wpId)
        .single()

      if (wp) {
        // Load product deliverables
        const { data: delivData } = await supabase
          .from('product_deliverables')
          .select('id, deliverable_name, deliverable_reference')
          .eq('project_id', wp.project_id)
          .eq('is_deleted', false)
          .order('deliverable_name', { ascending: true })

        setDeliverables(delivData || [])

        // Load product descriptions
        const { data: pdData } = await supabase
          .from('product_descriptions')
          .select('id, product_name, product_reference')
          .eq('project_id', wp.project_id)
          .eq('is_deleted', false)
          .order('product_name', { ascending: true })

        setProductDescriptions(pdData || [])
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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

    if (!formData.product_name.trim()) {
      setErrors({ product_name: 'Product name is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addProduct(wpId, formData)
      } else {
        result = await updateProduct(product.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving product: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Product' : 'Edit Product'}
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
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="product_name"
            value={formData.product_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter product name"
          />
          {errors.product_name && (
            <p className="mt-1 text-sm text-red-600">{errors.product_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Type
          </label>
          <select
            name="product_type"
            value={formData.product_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="deliverable">Deliverable</option>
            <option value="document">Document</option>
            <option value="software">Software</option>
            <option value="hardware">Hardware</option>
            <option value="service">Service</option>
            <option value="report">Report</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Description
          </label>
          <textarea
            name="product_description"
            value={formData.product_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the product..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Product Deliverable
            </label>
            <select
              name="linked_product_deliverable_id"
              value={formData.linked_product_deliverable_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {deliverables.map(deliv => (
                <option key={deliv.id} value={deliv.id}>
                  {deliv.deliverable_reference || deliv.deliverable_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Product Description
            </label>
            <select
              name="linked_product_description_id"
              value={formData.linked_product_description_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              {productDescriptions.map(pd => (
                <option key={pd.id} value={pd.id}>
                  {pd.product_reference || pd.product_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quality Criteria
          </label>
          <textarea
            name="quality_criteria"
            value={formData.quality_criteria}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Quality criteria for this product..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Acceptance Criteria
          </label>
          <textarea
            name="acceptance_criteria"
            value={formData.acceptance_criteria}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Acceptance criteria for this product..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delivery Status
            </label>
            <select
              name="delivery_status"
              value={formData.delivery_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delivery Date
            </label>
            <input
              type="date"
              name="delivery_date"
              value={formData.delivery_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Acceptance Date
            </label>
            <input
              type="date"
              name="acceptance_date"
              value={formData.acceptance_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
