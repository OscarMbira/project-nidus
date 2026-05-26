/**
 * Product Description Section
 * Section 5: Products to be delivered
 */

import { useState, useEffect } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct } from '../../services/briefProductService'
import ProductCard from './ProductCard'
import { Plus } from 'lucide-react'

export default function ProductDescriptionSection({ briefId, readOnly = false }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    purpose: '',
    composition: '',
    derivation: '',
    format_presentation: '',
    quality_criteria: '',
    quality_tolerance: '',
    quality_method: '',
    is_main_product: false
  })

  useEffect(() => {
    if (briefId) {
      loadProducts()
    }
  }, [briefId])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts(briefId)
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateProduct(editingId, formData)
      } else {
        await addProduct(briefId, formData)
      }
      await loadProducts()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + error.message)
    }
  }

  const handleEdit = (product) => {
    setFormData({
      product_name: product.product_name,
      product_description: product.product_description,
      purpose: product.purpose || '',
      composition: product.composition || '',
      derivation: product.derivation || '',
      format_presentation: product.format_presentation || '',
      quality_criteria: product.quality_criteria || '',
      quality_tolerance: product.quality_tolerance || '',
      quality_method: product.quality_method || '',
      is_main_product: product.is_main_product || false
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await deleteProduct(id)
      await loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      product_name: '',
      product_description: '',
      purpose: '',
      composition: '',
      derivation: '',
      format_presentation: '',
      quality_criteria: '',
      quality_tolerance: '',
      quality_method: '',
      is_main_product: false
    })
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before adding products
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            5. Project Product Description
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define the products that will be delivered by this project
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_main_product}
                  onChange={(e) => setFormData({ ...formData, is_main_product: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Main Project Product
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Purpose
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Why this product is needed..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Composition
              </label>
              <textarea
                value={formData.composition}
                onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="What it consists of..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Derivation
              </label>
              <textarea
                value={formData.derivation}
                onChange={(e) => setFormData({ ...formData, derivation: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="What it's based on..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quality Criteria <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.quality_criteria}
              onChange={(e) => setFormData({ ...formData, quality_criteria: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Tolerance
              </label>
              <input
                type="text"
                value={formData.quality_tolerance}
                onChange={(e) => setFormData({ ...formData, quality_tolerance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Method
              </label>
              <input
                type="text"
                value={formData.quality_method}
                onChange={(e) => setFormData({ ...formData, quality_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format/Presentation
            </label>
            <input
              type="text"
              value={formData.format_presentation}
              onChange={(e) => setFormData({ ...formData, format_presentation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="How it will be presented..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {editingId ? 'Update' : 'Add'} Product
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                resetForm()
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Products List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No products defined yet. At least one product is required.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {product.product_name}
                    </h3>
                    {product.is_main_product && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        Main Product
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{product.product_description}</p>
                  {product.purpose && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Purpose:</strong> {product.purpose}
                    </p>
                  )}
                  {product.quality_criteria && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Quality Criteria:</strong> {product.quality_criteria}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
