import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, Package } from 'lucide-react'
import { addCompositionItem, updateCompositionItem } from '../../services/ppdCompositionService'

export default function CompositionItemForm({ item, ppdId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    product_type: 'deliverable',
    is_mandatory: true,
    planned_delivery_stage: '',
    linked_product_id: ''
  })
  const [products, setProducts] = useState([])
  const [productDescriptions, setProductDescriptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchProducts()
    fetchProductDescriptions()
    if (item) {
      setFormData({
        product_name: item.product_name || '',
        product_description: item.product_description || '',
        product_type: item.product_type || 'deliverable',
        is_mandatory: item.is_mandatory !== undefined ? item.is_mandatory : true,
        planned_delivery_stage: item.planned_delivery_stage || '',
        linked_product_id: item.linked_product_id || '',
        product_description_id: item.product_description_id || ''
      })
    }
  }, [item, ppdId])

  const fetchProducts = async () => {
    try {
      // Get project_id from PPD
      const { data: ppd } = await supabase
        .from('project_product_descriptions')
        .select('project_id')
        .eq('id', ppdId)
        .single()

      if (!ppd) return

      const { data, error } = await supabase
        .from('product_deliverables')
        .select('id, product_name, product_code')
        .eq('project_id', ppd.project_id)
        .eq('is_deleted', false)
        .order('product_name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchProductDescriptions = async () => {
    try {
      // Get project_id from PPD
      const { data: ppd } = await supabase
        .from('project_product_descriptions')
        .select('project_id')
        .eq('id', ppdId)
        .single()

      if (!ppd) return

      const { data, error } = await supabase
        .from('product_descriptions')
        .select('id, product_title, pd_reference')
        .eq('project_id', ppd.project_id)
        .eq('is_deleted', false)
        .order('product_title')

      if (error) throw error
      setProductDescriptions(data || [])
    } catch (error) {
      console.error('Error fetching product descriptions:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
    
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

    // Validate
    const newErrors = {}
    if (!formData.product_name || formData.product_name.trim().length < 5) {
      newErrors.product_name = 'Product name must be at least 5 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setSaving(true)
      if (item) {
        await updateCompositionItem(item.id, formData)
      } else {
        await addCompositionItem(ppdId, formData)
      }
      onSave()
    } catch (error) {
      console.error('Error saving composition item:', error)
      alert('Error saving composition item: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {item ? 'Edit Composition Item' : 'Add Composition Item'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.product_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Name of the major product/deliverable"
            />
            {errors.product_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.product_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Description
            </label>
            <textarea
              name="product_description"
              value={formData.product_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Description of the product/deliverable"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Type *
              </label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="deliverable">Deliverable</option>
                <option value="service">Service</option>
                <option value="capability">Capability</option>
                <option value="document">Document</option>
                <option value="system">System</option>
                <option value="process">Process</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Planned Delivery Stage
              </label>
              <input
                type="text"
                name="planned_delivery_stage"
                value={formData.planned_delivery_stage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="e.g., Stage 1, Phase 2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Product Deliverable
            </label>
            <select
              name="linked_product_id"
              value={formData.linked_product_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">No Link</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_code ? `${product.product_code} - ` : ''}{product.product_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Product Description
            </label>
            <select
              name="product_description_id"
              value={formData.product_description_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">No Link</option>
              {productDescriptions.map((pd) => (
                <option key={pd.id} value={pd.id}>
                  {pd.pd_reference} - {pd.product_title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Link to a detailed Product Description for this composition item
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_mandatory"
              checked={formData.is_mandatory}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Mandatory (must be delivered)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
